import React, { useState, useEffect, useRef } from 'react';
import {
  DeploymentPlatform,
  DeploymentStatus,
  DeploymentConfig,
  DeploymentCredentials,
} from '../types';
import {
  PLATFORMS,
  PlatformInfo,
  getCredentials,
  saveCredential,
  removeCredential,
  hasCredentials,
  deployProject,
  prepareDeploymentFiles,
  getDeploymentHistory,
  DeploymentHistoryEntry,
} from '../services/deploymentService';
import { detectFramework } from '../services/projectBundler';

interface DeployPanelProps {
  darkMode: boolean;
  projectName: string;
  files: Record<string, string>;
  onClose: () => void;
  onDeployComplete?: (url: string) => void;
  onFixBuildError?: (error: string, logs: string[]) => void;
}

const DeployPanel: React.FC<DeployPanelProps> = ({
  darkMode,
  projectName,
  files,
  onClose,
  onDeployComplete,
  onFixBuildError,
}) => {
  const [activeTab, setActiveTab] = useState<'deploy' | 'credentials' | 'history'>('deploy');
  const [selectedPlatform, setSelectedPlatform] = useState<DeploymentPlatform>('maula');
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus>({
    state: 'idle',
    message: '',
    logs: [],
  });
  const [credentials, setCredentials] = useState<DeploymentCredentials[]>([]);
  const [history, setHistory] = useState<DeploymentHistoryEntry[]>([]);
  const [showAddToken, setShowAddToken] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [newTokenPlatform, setNewTokenPlatform] = useState<DeploymentPlatform>('vercel');
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [customProjectName, setCustomProjectName] = useState(projectName);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load credentials and history
  useEffect(() => {
    getCredentials().then(setCredentials);
    getDeploymentHistory().then(setHistory);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deployStatus.logs]);

  const handleDeploy = async () => {
    // Maula platform doesn't need credentials
    if (selectedPlatform !== 'maula' && !(await hasCredentials(selectedPlatform))) {
      setActiveTab('credentials');
      setShowAddToken(true);
      setNewTokenPlatform(selectedPlatform);
      return;
    }

    setDeployUrl(null);
    const framework = detectFramework(files);

    const config: DeploymentConfig = {
      platform: selectedPlatform,
      projectName: customProjectName || projectName,
      framework,
      buildCommand: framework === 'static' ? undefined : 'npm run build',
      outputDir: framework === 'static' ? '.' : 'dist',
    };

    const deployFiles = prepareDeploymentFiles(files, config);

    const result = await deployProject(config, deployFiles, (status) => {
      setDeployStatus(status);
    });

    if (result.success && result.url) {
      setDeployUrl(result.url);
      onDeployComplete?.(result.url);
    } else if (result.errorType === 'build' && result.buildLogs) {
      onFixBuildError?.(result.error || 'Build failed', result.buildLogs);
    }

    // Refresh history
    getDeploymentHistory().then(setHistory);
  };

  const handleSaveToken = async () => {
    if (!newToken.trim()) return;

    await saveCredential({
      platform: newTokenPlatform,
      token: newToken.trim(),
      teamId: newTeamId.trim() || undefined,
      label: newTokenLabel.trim() || undefined,
      addedAt: Date.now(),
    });

    setCredentials(await getCredentials());
    setNewToken('');
    setNewTokenLabel('');
    setNewTeamId('');
    setShowAddToken(false);
  };

  const handleRemoveToken = async (platform: DeploymentPlatform, label?: string) => {
    if (confirm(`Remove ${platform} credentials?`)) {
      await removeCredential(platform, label);
      setCredentials(await getCredentials());
    }
  };

  const bg = darkMode ? 'bg-canvas-card/95' : 'bg-white';
  const text = darkMode ? 'text-canvas-text' : 'text-gray-700';
  const textMuted = darkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const border = darkMode ? 'border-gray-800' : 'border-gray-200';
  const cardBg = darkMode ? 'bg-black/30' : 'bg-gray-50';
  const hoverBg = darkMode ? 'hover:bg-cyan-500/10' : 'hover:bg-cyan-50';

  return (
    <div className={`h-full flex flex-col ${bg}`}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <h3 className={`text-xs font-bold ${darkMode ? 'text-cyan-500/80' : 'text-cyan-600'} uppercase tracking-widest`}>
          🚀 Deploy
        </h3>
        <button onClick={onClose} className={`${textMuted} hover:text-cyan-400 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex px-6 gap-1 border-b ${border}`}>
        {(['deploy', 'credentials', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-t-lg ${activeTab === tab
                ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
                : `${textMuted} ${hoverBg}`
              }`}
          >
            {tab === 'deploy' ? '🚀 Deploy' : tab === 'credentials' ? '🔑 Keys' : '📋 History'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* ==================== DEPLOY TAB ==================== */}
        {activeTab === 'deploy' && (
          <>
            {/* Platform Selection */}
            <div>
              <label className={`block text-[10px] font-bold ${textMuted} uppercase tracking-widest mb-2`}>
                Deploy To
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((platform) => {
                  const hasCreds = credentials.some(c => c.platform === platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`relative flex items-center gap-2 p-3 rounded-lg border transition-all ${selectedPlatform === platform.id
                          ? 'bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                          : `${cardBg} ${border} ${hoverBg} hover:border-cyan-500/30`
                        }`}
                    >
                      <span className="text-lg">{platform.icon}</span>
                      <div className="text-left">
                        <p className={`text-xs font-bold ${text}`}>{platform.name}</p>
                        <p className={`text-[9px] ${textMuted}`}>
                          {hasCreds ? '✅ Connected' : '🔑 Add key'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label className={`block text-[10px] font-bold ${textMuted} uppercase tracking-widest mb-2`}>
                Project Name
              </label>
              <input
                type="text"
                value={customProjectName}
                onChange={e => setCustomProjectName(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${cardBg} ${text} outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30`}
                placeholder="my-awesome-app"
              />
            </div>

            {/* Deploy Button */}
            <button
              onClick={handleDeploy}
              disabled={deployStatus.state !== 'idle' && deployStatus.state !== 'ready' && deployStatus.state !== 'error'}
              className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${deployStatus.state === 'ready'
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-900/30'
                  : deployStatus.state === 'error'
                    ? 'bg-gradient-to-r from-primary-600 to-orange-600 text-white hover:from-primary-500 hover:to-orange-500'
                    : 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:from-cyan-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-canvas-muted-deep'
                }`}
            >
              {deployStatus.state === 'idle' ? `Deploy to ${PLATFORMS.find(p => p.id === selectedPlatform)?.name}` :
                deployStatus.state === 'ready' ? '✅ Deployed! Deploy Again?' :
                  deployStatus.state === 'error' ? '❌ Retry Deploy' :
                    '⏳ Deploying...'}
            </button>

            {/* Deployment Status */}
            {deployStatus.state !== 'idle' && (
              <div className={`rounded-lg border ${border} ${cardBg} overflow-hidden`}>
                {/* Status Header */}
                <div className={`px-4 py-2 flex items-center gap-2 border-b ${border}`}>
                  <div className={`w-2 h-2 rounded-full ${deployStatus.state === 'ready' ? 'bg-emerald-500' :
                      deployStatus.state === 'error' ? 'bg-primary-500' :
                        'bg-cyan-500 animate-pulse'
                    }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${deployStatus.state === 'ready' ? 'text-emerald-400' :
                      deployStatus.state === 'error' ? 'text-primary-400' :
                        'text-cyan-400'
                    }`}>
                    {deployStatus.message}
                  </span>
                </div>

                {/* Progress Bar */}
                {deployStatus.progress !== undefined && deployStatus.state !== 'ready' && deployStatus.state !== 'error' && (
                  <div className="h-1 bg-gray-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${deployStatus.progress}%` }}
                    />
                  </div>
                )}

                {/* Deploy URL */}
                {deployUrl && (
                  <div className={`px-4 py-3 border-b ${border}`}>
                    <p className={`text-[10px] ${textMuted} uppercase tracking-wider mb-1`}>Live URL</p>
                    <a
                      href={deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline break-all"
                    >
                      {deployUrl}
                    </a>
                  </div>
                )}

                {/* Logs */}
                <div className="max-h-40 overflow-y-auto p-3">
                  {deployStatus.logs.map((log, i) => (
                    <div key={i} className={`text-[10px] font-mono ${log.startsWith('✅') ? 'text-emerald-400' :
                        log.startsWith('❌') || log.toLowerCase().includes('error') ? 'text-primary-400' :
                          log.startsWith('⚠') ? 'text-yellow-400' :
                            textMuted
                      } leading-relaxed`}>
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>

                {/* Fix Build Errors Button */}
                {deployStatus.state === 'error' && deployStatus.error && (
                  <div className={`px-4 py-3 border-t ${border}`}>
                    <button
                      onClick={() => onFixBuildError?.(deployStatus.error!, deployStatus.logs)}
                      className="w-full py-2 text-xs font-bold bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all uppercase tracking-wider"
                    >
                      🔧 Ask AI to Fix Errors
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Platform Features */}
            <div>
              <label className={`block text-[10px] font-bold ${textMuted} uppercase tracking-widest mb-2`}>
                Platform Features
              </label>
              <div className="flex flex-wrap gap-1">
                {PLATFORMS.find(p => p.id === selectedPlatform)?.features.map((feature, i) => (
                  <span key={i} className={`px-2 py-1 text-[9px] rounded-full ${cardBg} ${border} border ${textMuted}`}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ==================== CREDENTIALS TAB ==================== */}
        {activeTab === 'credentials' && (
          <>
            {/* Saved Credentials */}
            {credentials.length > 0 ? (
              <div className="space-y-2">
                {credentials.map((cred, i) => {
                  const platform = PLATFORMS.find(p => p.id === cred.platform);
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${border} ${cardBg}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{platform?.icon}</span>
                        <div>
                          <p className={`text-xs font-bold ${text}`}>{platform?.name}</p>
                          <p className={`text-[10px] ${textMuted}`}>
                            {cred.label || 'Default'} · ****{cred.token.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveToken(cred.platform, cred.label)}
                        className="text-primary-400 hover:text-primary-300 p-1"
                        title="Remove"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-8 ${textMuted}`}>
                <p className="text-2xl mb-2">🔑</p>
                <p className="text-xs">No API keys added yet</p>
                <p className="text-[10px] mt-1">Add your deployment platform tokens below</p>
              </div>
            )}

            {/* Add New Token */}
            {showAddToken ? (
              <div className={`p-4 rounded-lg border ${border} ${cardBg} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold ${text} uppercase tracking-wider`}>Add API Token</h4>
                  <button onClick={() => setShowAddToken(false)} className={`${textMuted} hover:text-cyan-400`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Platform Select */}
                <div>
                  <label className={`block text-[10px] ${textMuted} mb-1`}>Platform</label>
                  <select
                    value={newTokenPlatform}
                    onChange={e => setNewTokenPlatform(e.target.value as DeploymentPlatform)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${cardBg} ${text} outline-none`}
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Token Guide */}
                <div className={`p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20`}>
                  <p className="text-[10px] text-cyan-400">
                    💡 {PLATFORMS.find(p => p.id === newTokenPlatform)?.tokenGuide}
                  </p>
                  <a
                    href={PLATFORMS.find(p => p.id === newTokenPlatform)?.tokenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-300 underline mt-1 inline-block"
                  >
                    Get your token →
                  </a>
                </div>

                {/* Label */}
                <div>
                  <label className={`block text-[10px] ${textMuted} mb-1`}>Label (optional)</label>
                  <input
                    type="text"
                    value={newTokenLabel}
                    onChange={e => setNewTokenLabel(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${cardBg} ${text} outline-none focus:border-cyan-500/50`}
                    placeholder="e.g., Personal, Work"
                  />
                </div>

                {/* Token */}
                <div>
                  <label className={`block text-[10px] ${textMuted} mb-1`}>API Token</label>
                  <input
                    type="password"
                    value={newToken}
                    onChange={e => setNewToken(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${cardBg} ${text} outline-none focus:border-cyan-500/50`}
                    placeholder="Enter your API token"
                  />
                </div>

                {/* Team ID (for platforms that need it) */}
                {PLATFORMS.find(p => p.id === newTokenPlatform)?.requiresTeamId && (
                  <div>
                    <label className={`block text-[10px] ${textMuted} mb-1`}>Account / Team ID</label>
                    <input
                      type="text"
                      value={newTeamId}
                      onChange={e => setNewTeamId(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${cardBg} ${text} outline-none focus:border-cyan-500/50`}
                      placeholder="Your account/team ID"
                    />
                  </div>
                )}

                {/* Security Note */}
                <div className={`p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20`}>
                  <p className="text-[10px] text-emerald-400">
                    🔒 Your token is stored locally in your browser and only sent to our secure backend for deployment. We never store your tokens on our servers.
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveToken}
                  disabled={!newToken.trim()}
                  className="w-full py-2 text-xs font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg hover:from-cyan-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-canvas-muted-deep transition-all uppercase tracking-wider"
                >
                  Save Token
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddToken(true)}
                className={`w-full py-3 rounded-lg border-2 border-dashed ${border} ${textMuted} text-xs font-bold uppercase tracking-wider hover:border-cyan-500/40 hover:text-cyan-400 transition-all`}
              >
                + Add API Token
              </button>
            )}
          </>
        )}

        {/* ==================== HISTORY TAB ==================== */}
        {activeTab === 'history' && (
          <>
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((entry) => {
                  const platform = PLATFORMS.find(p => p.id === entry.platform);
                  return (
                    <div key={entry.id} className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{platform?.icon}</span>
                          <span className={`text-xs font-bold ${text}`}>{entry.projectName}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${entry.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-primary-500/20 text-primary-400'
                            }`}>
                            {entry.status === 'success' ? '✅' : '❌'}
                          </span>
                        </div>
                      </div>
                      <p className={`text-[10px] ${textMuted}`}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      {entry.url && (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 underline mt-1 inline-block"
                        >
                          {entry.url}
                        </a>
                      )}
                      {entry.error && (
                        <p className="text-[10px] text-primary-400 mt-1">{entry.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-8 ${textMuted}`}>
                <p className="text-2xl mb-2">📋</p>
                <p className="text-xs">No deployments yet</p>
                <p className="text-[10px] mt-1">Deploy your first project to see history here</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DeployPanel;
