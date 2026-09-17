import { createLogger } from '../services/logger';
const log = createLogger('PackagingPanel');
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import packagingService, {
  BuildConfiguration,
  BuildTarget,
  Build,
  Platform,
  UpdateStatus,
  LicenseConfig,
  TelemetryConfig,
  AutoUpdateConfig,
} from '../services/packaging';

type TabType = 'targets' | 'builds' | 'updates' | 'license' | 'telemetry';

export const PackagingPanel: React.FC = () => {
  const { theme, files } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  const [activeTab, setActiveTab] = useState<TabType>('targets');
  const [config, setConfig] = useState<BuildConfiguration | null>(null);
  const [builds, setBuilds] = useState<Build[]>(packagingService.getAllBuilds());
  const [activeBuild, setActiveBuild] = useState<Build | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(packagingService.getUpdateStatus());
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<Platform>>(new Set(['windows', 'macos', 'linux']));
  const logRef = useRef<HTMLDivElement>(null);

  const platforms = packagingService.getPlatforms();

  // Feed workspace files to the service
  useEffect(() => {
    packagingService.setWorkspaceFiles(files);
  }, [files]);

  useEffect(() => {
    // Grab initial config
    setConfig(packagingService.getDefaultConfiguration());

    const unsubscribe = packagingService.on('*', (event) => {
      switch (event.type) {
        case 'configChanged':
          setConfig(event.data.config ? { ...event.data.config } : packagingService.getDefaultConfiguration());
          break;
        case 'buildStart':
        case 'buildProgress':
        case 'buildComplete':
        case 'buildError':
          setBuilds([...packagingService.getAllBuilds()]);
          if (event.data.build) setActiveBuild({ ...event.data.build });
          break;
        case 'updateAvailable':
        case 'updateDownloaded':
        case 'updateError':
          setUpdateStatus({ ...packagingService.getUpdateStatus() });
          break;
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [activeBuild?.logs.length]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'targets', label: 'Build Targets', icon: '🎯' },
    { id: 'builds', label: 'Builds', icon: '📦' },
    { id: 'updates', label: 'Auto-Update', icon: '🔄' },
    { id: 'license', label: 'License', icon: '📜' },
    { id: 'telemetry', label: 'Telemetry', icon: '📊' },
  ];

  if (!config) {
    return (
      <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'bg-[#1e1e1e] text-gray-500' : 'bg-white text-gray-400'}`}>
        <span className="text-3xl mb-3">📦</span>
        <p className="text-sm font-medium mb-1">Packaging & Distribution</p>
        <p className="text-xs text-center px-6">
          Open a project with a package.json to configure build targets, licensing, and distribution.
        </p>
      </div>
    );
  }

  const handleToggleTarget = (targetId: string) => {
    packagingService.toggleTarget(config.id, targetId);
    setConfig({ ...packagingService.getDefaultConfiguration()! });
  };

  const handleStartBuild = async (targetIds?: string[]) => {
    try {
      const newBuilds = await packagingService.startBuild(config.id, targetIds);
      if (newBuilds.length > 0) setActiveBuild(newBuilds[0]);
    } catch (error: any) {
      log.error('Build failed:', error);
    }
  };

  const handleCancelBuild = (buildId: string) => {
    packagingService.cancelBuild(buildId);
    setBuilds([...packagingService.getAllBuilds()]);
  };

  const handleCheckForUpdates = async () => {
    await packagingService.checkForUpdates();
    setUpdateStatus({ ...packagingService.getUpdateStatus() });
  };

  const handleDownloadUpdate = async () => {
    await packagingService.downloadUpdate();
    setUpdateStatus({ ...packagingService.getUpdateStatus() });
  };

  const handleInstallUpdate = async () => {
    await packagingService.installUpdate();
    setUpdateStatus({ ...packagingService.getUpdateStatus() });
  };

  const updateLicenseConfig = (updates: Partial<LicenseConfig>) => {
    const newConfig = { ...config, license: { ...config.license, ...updates } };
    packagingService.updateConfiguration(config.id, newConfig);
    setConfig(newConfig);
  };

  const updateTelemetryConfig = (updates: Partial<TelemetryConfig>) => {
    const newConfig = { ...config, telemetry: { ...config.telemetry, ...updates } };
    packagingService.updateConfiguration(config.id, newConfig);
    setConfig(newConfig);
  };

  const updateAutoUpdateConfig = (updates: Partial<AutoUpdateConfig>) => {
    const newConfig = { ...config, autoUpdate: { ...config.autoUpdate, ...updates } };
    packagingService.updateConfiguration(config.id, newConfig);
    setConfig(newConfig);
  };

  const togglePlatform = (platform: Platform) => {
    const newExpanded = new Set(expandedPlatforms);
    if (newExpanded.has(platform)) newExpanded.delete(platform);
    else newExpanded.add(platform);
    setExpandedPlatforms(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'building': return <span className="animate-spin">⏳</span>;
      case 'success': return <span className="text-green-400">✓</span>;
      case 'failed': return <span className="text-red-400">✗</span>;
      case 'cancelled': return <span className="text-yellow-400">⊘</span>;
      default: return <span className="text-gray-500">○</span>;
    }
  };

  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++; }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (start: Date, end?: Date): string => {
    const ms = (end || new Date()).getTime() - start.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getTargetsByPlatform = (platform: Platform): BuildTarget[] => {
    return config.targets.filter(t => t.platform === platform);
  };

  const getEnabledTargetsCount = (): number => {
    return config.targets.filter(t => t.enabled).length;
  };

  const projectLabel = packagingService.getProjectType();

  const renderBuildTarget = (target: BuildTarget) => (
    <div
      key={target.id}
      className={`flex items-center gap-3 py-2 px-3 rounded cursor-pointer transition-colors group ${target.enabled
          ? isDark ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-300'
          : isDark ? 'bg-[#2d2d2d] hover:bg-[#3c3c3c]' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      onClick={() => handleToggleTarget(target.id)}
    >
      <input
        type="checkbox"
        checked={target.enabled}
        onChange={() => { }}
        className="w-4 h-4 rounded"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {target.format.toUpperCase()}
          </span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({target.arch})</span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStartBuild([target.id]);
        }}
        disabled={!target.enabled}
        className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-30 rounded text-xs text-white"
      >
        Build
      </button>
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#1e1e1e] text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <span className="font-medium text-sm">Packaging & Distribution</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {config.version !== '0.0.0' && (
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>v{config.version}</span>
          )}
          {projectLabel !== 'unknown' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${projectLabel === 'electron'
                ? isDark ? 'bg-cyan-600/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
                : isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'
              }`}>
              {projectLabel}
            </span>
          )}
        </div>
      </div>

      {/* Tabs — scrollable */}
      <div className={`flex overflow-x-auto debug-tabs-scroll border-b ${isDark ? 'border-[#3c3c3c] bg-[#252526]' : 'border-gray-200 bg-gray-50'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === tab.id
                ? isDark ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-blue-600 border-b-2 border-blue-500 bg-white'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Build Targets Tab */}
        {activeTab === 'targets' && (
          <div className="flex-1 overflow-auto">
            {/* Build Actions */}
            <div className={`p-3 border-b ${isDark ? 'border-[#3c3c3c] bg-[#252526]' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartBuild()}
                  disabled={getEnabledTargetsCount() === 0}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-sm font-medium flex items-center justify-center gap-2 text-white"
                >
                  <span>▶</span>
                  Build All ({getEnabledTargetsCount()} targets)
                </button>
                <button
                  onClick={() => {
                    const configJson = packagingService.generateElectronBuilderConfig(config.id);
                    navigator.clipboard?.writeText(configJson);
                  }}
                  className={`px-3 py-2 rounded text-sm ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c]' : 'bg-gray-200 hover:bg-gray-300'}`}
                  title="Copy electron-builder config to clipboard"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Platforms */}
            {config.targets.length > 0 ? (
              <div className="p-2 space-y-2">
                {(Object.keys(platforms) as Platform[]).map(platform => {
                  const platformConfig = platforms[platform];
                  const targets = getTargetsByPlatform(platform);
                  if (targets.length === 0) return null;
                  const enabledCount = targets.filter(t => t.enabled).length;
                  const isExpanded = expandedPlatforms.has(platform);

                  return (
                    <div key={platform} className={`rounded-lg overflow-hidden ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${isDark ? 'hover:bg-[#2d2d2d]' : 'hover:bg-gray-100'}`}
                        onClick={() => togglePlatform(platform)}
                      >
                        <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                        <span className="text-xl">{platformConfig.icon}</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{platformConfig.name}</span>
                        <span className={`text-xs ml-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {enabledCount}/{targets.length} targets
                        </span>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`p-2 space-y-1 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                              {targets.map(target => renderBuildTarget(target))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-6 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <p className="text-2xl mb-2">🎯</p>
                <p className="font-medium mb-1">No build targets</p>
                <p className="text-xs">
                  {packagingService.hasPackageJson()
                    ? 'Add electron or electron-builder to your project to enable cross-platform builds.'
                    : 'Open a project with a package.json to auto-detect build targets.'}
                </p>
              </div>
            )}

            {/* Signing & Notarization */}
            {config.targets.length > 0 && (
              <div className={`p-3 border-t ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Code Signing</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={config.signing.enabled}
                      onChange={(e) => {
                        const newConfig = { ...config, signing: { ...config.signing, enabled: e.target.checked } };
                        packagingService.updateConfiguration(config.id, newConfig);
                        setConfig(newConfig);
                      }}
                      className="w-4 h-4"
                    />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Enable code signing</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={config.notarization.enabled}
                      onChange={(e) => {
                        const newConfig = { ...config, notarization: { ...config.notarization, enabled: e.target.checked } };
                        packagingService.updateConfiguration(config.id, newConfig);
                        setConfig(newConfig);
                      }}
                      className="w-4 h-4"
                    />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Enable macOS notarization</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Builds Tab */}
        {activeTab === 'builds' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              {builds.length > 0 ? (
                <div className={`divide-y ${isDark ? 'divide-[#3c3c3c]' : 'divide-gray-200'}`}>
                  {builds.map(build => {
                    const platformConfig = platforms[build.target.platform];
                    return (
                      <div
                        key={build.id}
                        onClick={() => setActiveBuild(build)}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${activeBuild?.id === build.id
                            ? isDark ? 'bg-[#094771]' : 'bg-blue-50'
                            : isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-gray-50'
                          }`}
                      >
                        {getStatusIcon(build.status)}
                        <span className="text-lg">{platformConfig.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {build.target.format.toUpperCase()} ({build.target.arch})
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {build.startTime.toLocaleTimeString()}
                            {build.endTime && ` • ${formatDuration(build.startTime, build.endTime)}`}
                          </div>
                        </div>
                        {build.status === 'building' && (
                          <div className="w-16">
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'}`}>
                              <motion.div
                                className="h-full bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${build.progress}%` }}
                              />
                            </div>
                            <div className={`text-xs text-center mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{build.progress}%</div>
                          </div>
                        )}
                        {build.status === 'building' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelBuild(build.id);
                            }}
                            className="px-2 py-1 text-red-400 hover:bg-red-900/30 rounded text-xs"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No builds yet. Select targets and click Build.
                </div>
              )}
            </div>

            {/* Build Details */}
            {activeBuild && (
              <div className={`h-48 border-t flex flex-col ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                <div className={`flex items-center justify-between px-3 py-1 border-b ${isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-xs">
                    {getStatusIcon(activeBuild.status)}
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>
                      {activeBuild.target.format.toUpperCase()} ({activeBuild.target.platform} {activeBuild.target.arch})
                    </span>
                  </div>
                  {activeBuild.artifacts.length > 0 && (
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatSize(activeBuild.artifacts[0].size)}
                    </span>
                  )}
                </div>
                <div
                  ref={logRef}
                  className={`flex-1 overflow-auto p-2 font-mono text-xs ${isDark ? 'bg-[#1e1e1e]' : 'bg-gray-50'}`}
                >
                  {activeBuild.logs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                            log.level === 'debug' ? 'text-gray-600' :
                              isDark ? 'text-gray-300' : 'text-gray-700'
                      }
                    >
                      <span className="text-gray-600">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto-Update Tab */}
        {activeTab === 'updates' && (
          <div className="flex-1 overflow-auto p-3 space-y-4">
            {/* Update Status */}
            <div className={`rounded-lg p-4 ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Current Version</h3>
                <span className="text-lg font-mono text-green-400">
                  v{updateStatus.currentVersion}
                </span>
              </div>

              {updateStatus.available && updateStatus.updateInfo && (
                <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 text-sm font-medium">
                      Update Available: v{updateStatus.updateInfo.version}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatSize(updateStatus.updateInfo.size)}
                    </span>
                  </div>
                  {updateStatus.downloading && (
                    <div className="mt-2">
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#3c3c3c]' : 'bg-gray-200'}`}>
                        <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${updateStatus.progress}%` }} />
                      </div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Downloading... {updateStatus.progress}%</div>
                    </div>
                  )}
                  {!updateStatus.downloading && !updateStatus.downloaded && (
                    <button onClick={handleDownloadUpdate} className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white">
                      Download Update
                    </button>
                  )}
                  {updateStatus.downloaded && (
                    <button onClick={handleInstallUpdate} className="mt-2 w-full py-2 bg-green-600 hover:bg-green-700 rounded text-sm text-white">
                      Install & Restart
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleCheckForUpdates}
                disabled={updateStatus.checking}
                className={`w-full py-2 disabled:opacity-50 rounded text-sm flex items-center justify-center gap-2 ${isDark ? 'bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
              >
                {updateStatus.checking ? (
                  <><span className="animate-spin">⏳</span> Checking...</>
                ) : (
                  <>🔍 Check for Updates</>
                )}
              </button>
            </div>

            {/* Auto-Update Settings */}
            <div className={`rounded-lg p-4 ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Auto-Update Settings</h3>
              <div className="space-y-3">
                {([
                  { key: 'enabled', label: 'Enable auto-updates' },
                  { key: 'autoDownload', label: 'Auto-download updates' },
                  { key: 'autoInstallOnAppQuit', label: 'Install on quit' },
                  { key: 'allowPrerelease', label: 'Allow pre-release versions' },
                ] as const).map(opt => (
                  <label key={opt.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.autoUpdate[opt.key]}
                      onChange={(e) => updateAutoUpdateConfig({ [opt.key]: e.target.checked } as any)}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{opt.label}</span>
                  </label>
                ))}

                <div>
                  <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Update Channel</label>
                  <select
                    value={config.autoUpdate.channel}
                    onChange={(e) => updateAutoUpdateConfig({ channel: e.target.value as any })}
                    className={`w-full text-sm px-3 py-2 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                  >
                    <option value="stable">Stable</option>
                    <option value="beta">Beta</option>
                    <option value="alpha">Alpha</option>
                    <option value="dev">Dev</option>
                  </select>
                </div>

                <div>
                  <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check Interval (minutes)</label>
                  <input
                    type="number"
                    value={config.autoUpdate.checkInterval}
                    onChange={(e) => updateAutoUpdateConfig({ checkInterval: parseInt(e.target.value) || 60 })}
                    className={`w-full text-sm px-3 py-2 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                    min={5}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* License Tab */}
        {activeTab === 'license' && (
          <div className="flex-1 overflow-auto p-3 space-y-4">
            <div className={`rounded-lg p-4 ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>License Type</h3>
              <select
                value={config.license.type}
                onChange={(e) => updateLicenseConfig({ type: e.target.value as any })}
                className={`w-full text-sm px-3 py-2 rounded mb-3 outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
              >
                <option value="MIT">MIT License</option>
                <option value="Apache-2.0">Apache License 2.0</option>
                <option value="GPL-3.0">GNU GPL v3</option>
                <option value="BSD-3-Clause">BSD 3-Clause</option>
                <option value="proprietary">Proprietary</option>
                <option value="custom">Custom</option>
              </select>

              {config.license.type !== 'custom' && (
                <div className={`rounded p-3 max-h-48 overflow-auto ${isDark ? 'bg-[#1e1e1e]' : 'bg-white border border-gray-200'}`}>
                  <pre className={`text-xs whitespace-pre-wrap font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {packagingService.getLicenseTemplate(config.license.type).slice(0, 500)}...
                  </pre>
                </div>
              )}

              {config.license.type === 'custom' && (
                <textarea
                  value={config.license.customText || ''}
                  onChange={(e) => updateLicenseConfig({ customText: e.target.value })}
                  placeholder="Enter custom license text..."
                  className={`w-full h-32 text-xs px-3 py-2 rounded font-mono resize-none outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                />
              )}
            </div>

            <div className={`rounded-lg p-4 ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>License Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.license.eulaRequired}
                    onChange={(e) => updateLicenseConfig({ eulaRequired: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require EULA acceptance</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.license.licenseKey?.enabled || false}
                    onChange={(e) => updateLicenseConfig({
                      licenseKey: { ...config.license.licenseKey, enabled: e.target.checked, offlineValidation: false }
                    })}
                    className="w-4 h-4"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require license key</span>
                </label>

                {config.license.licenseKey?.enabled && (
                  <div className="ml-6 space-y-2">
                    <input
                      type="text"
                      value={config.license.licenseKey.validationUrl || ''}
                      onChange={(e) => updateLicenseConfig({
                        licenseKey: { ...config.license.licenseKey!, validationUrl: e.target.value }
                      })}
                      placeholder="License validation URL"
                      className={`w-full text-xs px-3 py-2 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.license.licenseKey.offlineValidation}
                        onChange={(e) => updateLicenseConfig({
                          licenseKey: { ...config.license.licenseKey!, offlineValidation: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Allow offline validation</span>
                    </label>
                  </div>
                )}

                <div>
                  <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Trial Period (days)</label>
                  <input
                    type="number"
                    value={config.license.trialDays || 0}
                    onChange={(e) => updateLicenseConfig({ trialDays: parseInt(e.target.value) || 0 })}
                    className={`w-full text-sm px-3 py-2 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                    min={0}
                    placeholder="0 = No trial"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Telemetry Tab */}
        {activeTab === 'telemetry' && (
          <div className="flex-1 overflow-auto p-3 space-y-4">
            <div className={`rounded-lg p-4 ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Telemetry Collection</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.telemetry.enabled}
                    onChange={(e) => updateTelemetryConfig({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {config.telemetry.enabled && (
                <div className="space-y-3">
                  {([
                    { key: 'anonymousUsage', label: 'Anonymous usage statistics' },
                    { key: 'crashReports', label: 'Crash reports' },
                    { key: 'performanceMetrics', label: 'Performance metrics' },
                    { key: 'featureUsage', label: 'Feature usage tracking' },
                  ] as const).map(opt => (
                    <label key={opt.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.telemetry[opt.key]}
                        onChange={(e) => updateTelemetryConfig({ [opt.key]: e.target.checked } as any)}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {config.telemetry.enabled && (
              <>
                <div className={`rounded-lg p-4 ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>
                  <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Privacy Settings</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.telemetry.optOutByDefault}
                        onChange={(e) => updateTelemetryConfig({ optOutByDefault: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Opt-out by default</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.telemetry.gdprCompliant}
                        onChange={(e) => updateTelemetryConfig({ gdprCompliant: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>GDPR compliant</span>
                    </label>

                    <div>
                      <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sample Rate (%)</label>
                      <input
                        type="number"
                        value={config.telemetry.sampleRate}
                        onChange={(e) => updateTelemetryConfig({ sampleRate: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className={`w-full text-sm px-3 py-2 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                        min={0}
                        max={100}
                      />
                    </div>

                    <div>
                      <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Data Retention (days)</label>
                      <input
                        type="number"
                        value={config.telemetry.dataRetentionDays}
                        onChange={(e) => updateTelemetryConfig({ dataRetentionDays: parseInt(e.target.value) || 90 })}
                        className={`w-full text-sm px-3 py-2 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                        min={1}
                      />
                    </div>

                    <div>
                      <label className={`text-xs block mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Telemetry Endpoint</label>
                      <input
                        type="text"
                        value={config.telemetry.endpoint || ''}
                        onChange={(e) => updateTelemetryConfig({ endpoint: e.target.value })}
                        placeholder="https://telemetry.yourapp.com/collect"
                        className={`w-full text-xs px-3 py-2 rounded outline-none ${isDark ? 'bg-[#3c3c3c] text-white' : 'bg-white text-gray-900 border border-gray-300'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className={`rounded-lg p-3 ${isDark ? 'bg-yellow-900/30 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠️</span>
                    <div className="text-xs">
                      <p className={`font-medium mb-1 ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>Privacy Notice</p>
                      <p className={isDark ? 'text-yellow-400/80' : 'text-yellow-700'}>
                        Ensure your privacy policy covers all collected data.
                        Users must be informed and given the option to opt-out.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={`flex items-center justify-between px-3 py-1 border-t text-xs ${isDark ? 'bg-[#252526] border-[#3c3c3c] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        <div className="flex items-center gap-3">
          {config.targets.filter(t => t.platform === 'windows').length > 0 && (
            <span>🪟 {config.targets.filter(t => t.platform === 'windows' && t.enabled).length}</span>
          )}
          {config.targets.filter(t => t.platform === 'macos').length > 0 && (
            <span>🍎 {config.targets.filter(t => t.platform === 'macos' && t.enabled).length}</span>
          )}
          {config.targets.filter(t => t.platform === 'linux').length > 0 && (
            <span>🐧 {config.targets.filter(t => t.platform === 'linux' && t.enabled).length}</span>
          )}
          {config.targets.length === 0 && <span>No targets</span>}
        </div>
        <div className="flex items-center gap-2">
          {builds.some(b => b.status === 'building') && (
            <span className="flex items-center gap-1 text-blue-400">
              <span className="animate-spin">⏳</span>
              Building...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackagingPanel;
