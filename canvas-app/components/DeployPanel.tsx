/**
 * DeployPanel - Full-screen deployment dashboard
 * Deploy, manage domains, view analytics, rollback, and monitor — all in one place
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Rocket,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  X,
  Clock,
  AlertTriangle,
  Wrench,
  Shield,
  Zap,
  Wifi,
  BarChart3,
  RotateCcw,
  Activity,
  Trash2,
  Share2,
  Link2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { DeploymentStatus, DeploymentConfig } from '../types';
import deploymentService, { DeploymentHistoryEntry, LiveDeployment } from '../services/deploymentService';
import MonitoringDashboard from './deploy/MonitoringDashboard';

interface DeployPanelProps {
  darkMode?: boolean;
  projectName: string;
  projectId?: string;
  files: Record<string, string>;
  onClose: () => void;
  onDeployComplete?: (url: string, platform: 'maula') => void;
  onFixBuildError?: (error: string, buildLogs: string[]) => void;
}

type TabId = 'deploy' | 'history' | 'domains' | 'analytics' | 'monitoring';

const DeployPanel: React.FC<DeployPanelProps> = ({
  projectName,
  projectId,
  files,
  onClose,
  onDeployComplete,
  onFixBuildError,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('deploy');
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus>({ state: 'idle', message: '', logs: [] });
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<DeploymentHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Domain state
  const [domains, setDomains] = useState<{ id: string; domain: string; status: string; primary: boolean; addedAt: string }[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  // Live deployments & analytics state
  const [liveDeployments, setLiveDeployments] = useState<LiveDeployment[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const h = await deploymentService.getDeploymentHistory();
      setHistory(h);
    } catch { }
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load live deployments when analytics or domains tab is selected
  const loadLiveDeployments = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const deps = await deploymentService.listDeployments();
      setLiveDeployments(deps);
    } catch { }
    setLoadingAnalytics(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'domains') {
      loadLiveDeployments();
    }
  }, [activeTab, loadLiveDeployments]);

  const handleDeploy = async () => {
    setDeployUrl(null);
    setDeployStatus({ state: 'preparing', message: 'Preparing...', logs: [] });

    const config: DeploymentConfig = {
      platform: 'maula',
      projectName: projectName || 'canvas-project',
      framework: 'static',
    };

    const deployFiles = deploymentService.prepareDeploymentFiles(files, config);

    const result = await deploymentService.deployProject(config, deployFiles, (status) => {
      setDeployStatus(status);
      if (status.url) setDeployUrl(status.url);
    });

    if (result.success && result.url) {
      setDeployUrl(result.url);
      onDeployComplete?.(result.url, 'maula');
    }
    loadHistory();
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFixErrors = () => {
    if (deployStatus.error && deployStatus.logs && onFixBuildError) {
      onFixBuildError(deployStatus.error, deployStatus.logs);
      onClose();
    }
  };

  const handleDeleteDeployment = async (entry: DeploymentHistoryEntry) => {
    if (!confirm(`Delete deployment "${entry.projectName}"? This cannot be undone.`)) return;
    try {
      const result = await deploymentService.deleteDeployment(entry.id);
      if (result.success) {
        setHistory(prev => prev.filter(h => h.id !== entry.id));
        setLiveDeployments(prev => prev.filter(d => d.id !== entry.id && d.slug !== entry.id));
      } else {
        alert(result.error || 'Failed to delete deployment');
      }
    } catch {
      alert('Failed to delete deployment');
    }
  };

  const handleShare = (url: string) => {
    if (navigator.share) {
      navigator.share({ title: projectName, url });
    } else {
      handleCopy(url, 'share');
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    try {
      // Find the latest successful deployment to attach the domain to
      const latestDeployment = liveDeployments[0] || (history.find(h => h.status === 'success'));
      const deploymentId = latestDeployment?.id || subdomain;

      const result = await deploymentService.addCustomDomain(deploymentId, newDomain.trim());
      if (result.success) {
        const d = {
          id: Date.now().toString(),
          domain: newDomain.trim(),
          status: 'pending',
          primary: domains.length === 0,
          addedAt: new Date().toISOString(),
        };
        setDomains(prev => [...prev, d]);
        setNewDomain('');
      } else {
        alert(result.error || 'Failed to add domain');
      }
    } catch {
      alert('Failed to add domain');
    }
    setAddingDomain(false);
  };

  const subdomain = (projectName || 'my-app').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'deploy', label: 'Deploy', icon: Rocket },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'domains', label: 'Domains', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'monitoring', label: 'Monitor', icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-canvas-card">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-canvas-border bg-canvas-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-900/60 to-primary-800/40 rounded-xl">
            <Rocket className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-200">Deployment Center</h2>
            <p className="text-[10px] text-canvas-muted-deep">{projectName || 'Untitled'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-canvas-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${activeTab === tab.id
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-canvas-muted-deep hover:text-canvas-text hover:bg-white/[0.04] border border-transparent'
                }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        <button onClick={onClose} className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors">
          <X className="w-5 h-5 text-canvas-muted-deep" />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ════════ DEPLOY TAB ════════ */}
        {activeTab === 'deploy' && (
          <div className="max-w-3xl mx-auto p-8 space-y-6">
            {/* Ready to deploy */}
            {deployStatus.state === 'idle' && !deployUrl && (
              <>
                <div className="p-6 rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/[0.08] to-transparent">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-800/30 flex items-center justify-center text-4xl shadow-lg shadow-primary-500/10 shrink-0">
                      🚀
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-bold text-gray-200 mb-1">Publish Your App</p>
                      <p className="text-sm text-canvas-muted mb-4">
                        Deploy to <span className="text-primary-400 font-semibold">{subdomain}.sanbayfusion.com</span> — instant, free, shareable
                      </p>

                      <div className="flex flex-wrap gap-3 mb-6">
                        {[
                          { icon: Shield, label: 'Free SSL', color: 'text-emerald-400' },
                          { icon: Wifi, label: 'Global CDN', color: 'text-cyan-400' },
                          { icon: Zap, label: 'Instant Deploy', color: 'text-yellow-400' },
                          { icon: Share2, label: 'Shareable Link', color: 'text-purple-400' },
                          { icon: RotateCcw, label: 'Rollback', color: 'text-blue-400' },
                          { icon: Globe, label: 'Custom Domain', color: 'text-pink-400' },
                        ].map(f => (
                          <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-lg border border-canvas-border">
                            <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
                            <span className="text-[11px] text-canvas-muted">{f.label}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleDeploy}
                        className="px-8 py-3 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all active:scale-[0.98] bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/20"
                      >
                        <Rocket className="w-4 h-4" />
                        Deploy Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick access to last deployment */}
                {history.length > 0 && history[0].status === 'success' && history[0].url && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-canvas-border bg-white/[0.02]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-canvas-muted">Last deploy:</span>
                    <a href={history[0].url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary-400 hover:underline truncate flex-1">{history[0].url}</a>
                    <span className="text-[10px] text-gray-600">{new Date(history[0].timestamp).toLocaleDateString()}</span>
                    <button onClick={() => handleCopy(history[0].url!, 'last')} className="p-1 hover:bg-white/[0.06] rounded-lg">
                      {copied === 'last' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-canvas-muted-deep" />}
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-gray-600 text-center">
                  No tokens or API keys needed · Deploys in seconds · Free forever
                </p>
              </>
            )}

            {/* Deploying progress */}
            {deployStatus.state !== 'idle' && deployStatus.state !== 'ready' && deployStatus.state !== 'error' && !deployUrl && (
              <div className="space-y-6 p-6 rounded-2xl border border-canvas-border bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-500/10 rounded-xl">
                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-200">{deployStatus.message}</p>
                    <p className="text-xs text-canvas-muted-deep">Publishing to sanbayfusion.com CDN</p>
                  </div>
                </div>
                {deployStatus.progress !== undefined && (
                  <div className="w-full bg-canvas-card rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500"
                      style={{ width: `${deployStatus.progress}%` }} />
                  </div>
                )}
                <div className="bg-canvas-card rounded-xl p-4 max-h-48 overflow-y-auto border border-canvas-border">
                  {deployStatus.logs.map((log, i) => (
                    <p key={i} className="text-[11px] text-canvas-muted font-mono leading-relaxed">{log}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Deploy success */}
            {(deployStatus.state === 'ready' || deployUrl) && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                  <Check className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-base font-bold text-emerald-400">Deployed Successfully! 🎉</p>
                    <p className="text-xs text-emerald-400/70 mt-0.5">Your site is live with free SSL &amp; global CDN</p>
                  </div>
                </div>

                <div className="bg-canvas-card rounded-2xl p-5 border border-canvas-border">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary-400 shrink-0" />
                    <span className="text-sm font-medium text-canvas-text truncate flex-1">{deployUrl}</span>
                    <button onClick={() => handleCopy(deployUrl!, 'url')} className="p-2 hover:bg-white/[0.06] rounded-lg" title="Copy URL">
                      {copied === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-canvas-muted-deep" />}
                    </button>
                    <button onClick={() => handleShare(deployUrl!)} className="p-2 hover:bg-white/[0.06] rounded-lg" title="Share">
                      <Share2 className="w-4 h-4 text-canvas-muted-deep" />
                    </button>
                    <a href={deployUrl!} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/[0.06] rounded-lg" title="Open">
                      <ExternalLink className="w-4 h-4 text-canvas-muted-deep" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setActiveTab('history')}
                    className="py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-canvas-border text-canvas-muted text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Clock className="w-3.5 h-3.5" /> View History
                  </button>
                  <button onClick={() => setActiveTab('domains')}
                    className="py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-canvas-border text-canvas-muted text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Custom Domain
                  </button>
                  <button onClick={() => { setDeployStatus({ state: 'idle', message: '', logs: [] }); setDeployUrl(null); }}
                    className="py-3 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 text-primary-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Rocket className="w-3.5 h-3.5" /> Deploy Again
                  </button>
                </div>
              </div>
            )}

            {/* Deploy error */}
            {deployStatus.state === 'error' && !deployUrl && (
              <div className="space-y-5 p-6 rounded-2xl border border-primary-500/20 bg-primary-500/[0.04]">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-primary-400 shrink-0" />
                  <div>
                    <p className="text-base font-bold text-primary-400">Deployment Failed</p>
                    <p className="text-xs text-primary-400/70 mt-1">{deployStatus.error}</p>
                  </div>
                </div>
                <div className="bg-canvas-card rounded-xl p-4 max-h-48 overflow-y-auto border border-canvas-border">
                  {deployStatus.logs.map((log, i) => (
                    <p key={i} className="text-[11px] text-canvas-muted font-mono leading-relaxed">{log}</p>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={handleFixErrors}
                    className="flex-1 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Wrench className="w-3.5 h-3.5" /> Ask AI to Fix
                  </button>
                  <button onClick={() => setDeployStatus({ state: 'idle', message: '', logs: [] })}
                    className="flex-1 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-canvas-border text-canvas-muted text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ HISTORY TAB ════════ */}
        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto p-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-canvas-text">Deployment History</h3>
              <button onClick={loadHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.06] rounded-lg text-[11px] text-canvas-muted transition-colors">
                <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-10 h-10 mx-auto mb-4 text-gray-700" />
                <p className="text-sm text-canvas-muted-deep">No deployments yet</p>
                <p className="text-xs text-gray-600 mt-1">Deploy your first app to see it here</p>
                <button onClick={() => setActiveTab('deploy')}
                  className="mt-4 px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-xs font-medium rounded-lg transition-colors">
                  Deploy Now
                </button>
              </div>
            ) : (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total', value: String(history.length), color: 'text-gray-200' },
                    { label: 'Successful', value: String(history.filter(h => h.status === 'success').length), color: 'text-emerald-400' },
                    { label: 'Failed', value: String(history.filter(h => h.status === 'failed').length), color: 'text-primary-400' },
                    { label: 'Latest', value: history[0] ? new Date(history[0].timestamp).toLocaleDateString() : '—', color: 'text-canvas-text' },
                  ].map(s => (
                    <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 border border-canvas-border">
                      <p className="text-[10px] text-gray-600 mb-1">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* History list */}
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id}
                      className="bg-white/[0.02] rounded-xl p-4 border border-canvas-border hover:border-white/[0.1] transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-emerald-400' : 'bg-primary-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-gray-200 truncate">{entry.projectName}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-500/10 text-primary-400'
                              }`}>{entry.status}</span>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {new Date(entry.timestamp).toLocaleString()} · sanbayfusion.com
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {entry.url && (
                            <>
                              <button onClick={() => handleCopy(entry.url!, entry.id)} className="p-1.5 hover:bg-white/[0.06] rounded-lg" title="Copy URL">
                                {copied === entry.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-canvas-muted-deep" />}
                              </button>
                              <button onClick={() => handleShare(entry.url!)} className="p-1.5 hover:bg-white/[0.06] rounded-lg" title="Share">
                                <Share2 className="w-3 h-3 text-canvas-muted-deep" />
                              </button>
                              <a href={entry.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-white/[0.06] rounded-lg" title="Visit">
                                <ExternalLink className="w-3 h-3 text-canvas-muted-deep" />
                              </a>
                            </>
                          )}
                          <button onClick={() => handleDeleteDeployment(entry)} className="p-1.5 hover:bg-primary-500/10 rounded-lg" title="Delete">
                            <Trash2 className="w-3 h-3 text-gray-600 hover:text-primary-400" />
                          </button>
                        </div>
                      </div>
                      {entry.url && (
                        <div className="mt-2 pl-5 flex items-center gap-2">
                          <Link2 className="w-3 h-3 text-gray-600 shrink-0" />
                          <a href={entry.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-primary-400/70 hover:text-primary-400 truncate">{entry.url}</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════ DOMAINS TAB ════════ */}
        {activeTab === 'domains' && (
          <div className="max-w-3xl mx-auto p-8 space-y-6">
            <h3 className="text-sm font-semibold text-canvas-text">Custom Domains</h3>

            {/* Default domain */}
            <div className="bg-white/[0.02] rounded-xl p-4 border border-canvas-border">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-primary-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-200">{subdomain}.sanbayfusion.com</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Default subdomain · Free SSL</p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Active</span>
                <button onClick={() => handleCopy(`https://${subdomain}.sanbayfusion.com`, 'default-domain')} className="p-1.5 hover:bg-white/[0.06] rounded-lg">
                  {copied === 'default-domain' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-canvas-muted-deep" />}
                </button>
              </div>
            </div>

            {/* Add custom domain */}
            <div className="bg-white/[0.02] rounded-xl p-5 border border-canvas-border">
              <p className="text-xs font-semibold text-canvas-text mb-3">Add Custom Domain</p>
              <div className="flex gap-2">
                <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 bg-black/30 border border-canvas-border rounded-lg px-3 py-2 text-xs text-canvas-text placeholder-gray-600 outline-none focus:border-primary-500/30"
                  onKeyDown={e => e.key === 'Enter' && handleAddDomain()} />
                <button onClick={handleAddDomain} disabled={!newDomain.trim() || addingDomain}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg disabled:opacity-30 transition-colors flex items-center gap-1.5">
                  {addingDomain ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                Point your domain's CNAME record to <span className="text-canvas-muted font-mono">{subdomain}.sanbayfusion.com</span>
              </p>
            </div>

            {/* Custom domains list */}
            {domains.length > 0 && (
              <div className="space-y-2">
                {domains.map(d => (
                  <div key={d.id} className="bg-white/[0.02] rounded-xl p-4 border border-canvas-border flex items-center gap-3">
                    <Globe className="w-4 h-4 text-canvas-muted-deep shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200">{d.domain}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Added {new Date(d.addedAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-400'
                      : d.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-primary-500/10 text-primary-400'
                      }`}>{d.status === 'pending' ? 'DNS Pending' : d.status}</span>
                    <button onClick={() => setDomains(prev => prev.filter(x => x.id !== d.id))} className="p-1.5 hover:bg-primary-500/10 rounded-lg">
                      <Trash2 className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* DNS instructions */}
            <div className="bg-white/[0.02] rounded-xl p-5 border border-canvas-border">
              <p className="text-xs font-semibold text-canvas-text mb-3">DNS Configuration</p>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-[10px] text-canvas-muted-deep font-medium px-2">
                  <span>Type</span><span>Name</span><span>Value</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-black/30 rounded-lg px-2 py-2 text-[11px] font-mono">
                  <span className="text-cyan-400">CNAME</span>
                  <span className="text-canvas-muted">@</span>
                  <span className="text-canvas-text">{subdomain}.sanbayfusion.com</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-black/30 rounded-lg px-2 py-2 text-[11px] font-mono">
                  <span className="text-cyan-400">CNAME</span>
                  <span className="text-canvas-muted">www</span>
                  <span className="text-canvas-text">{subdomain}.sanbayfusion.com</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ ANALYTICS TAB ════════ */}
        {activeTab === 'analytics' && (
          <div className="max-w-3xl mx-auto p-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-canvas-text">Deployment Analytics</h3>
              <button onClick={loadLiveDeployments}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.06] rounded-lg text-[11px] text-canvas-muted transition-colors">
                <RefreshCw className={`w-3 h-3 ${loadingAnalytics ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            {loadingAnalytics && liveDeployments.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
              </div>
            ) : (
              <>
                {/* Real stats from deployments data */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Live Deployments', value: String(liveDeployments.length), icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Total Deploys', value: String(history.length), icon: Rocket, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                    { label: 'Success Rate', value: history.length > 0 ? `${((history.filter(h => h.status === 'success').length / history.length) * 100).toFixed(0)}%` : '—', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                    { label: 'Successful', value: String(history.filter(h => h.status === 'success').length), icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Failed', value: String(history.filter(h => h.status === 'failed').length), icon: AlertTriangle, color: 'text-primary-400', bg: 'bg-primary-500/10' },
                    { label: 'Latest Deploy', value: history[0] ? new Date(history[0].timestamp).toLocaleDateString() : '—', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white/[0.02] rounded-xl p-5 border border-canvas-border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                          <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                        </div>
                        <span className="text-[10px] text-canvas-muted-deep">{stat.label}</span>
                      </div>
                      <p className="text-xl font-bold text-gray-200">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Live deployments list */}
                {liveDeployments.length > 0 && (
                  <div className="bg-white/[0.02] rounded-xl p-5 border border-canvas-border">
                    <p className="text-xs font-semibold text-canvas-text mb-3">Live Deployments</p>
                    {liveDeployments.map((dep) => (
                      <div key={dep.id} className="flex items-center gap-3 py-2.5 border-b border-canvas-border last:border-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-canvas-text font-medium truncate">{dep.name || dep.slug}</p>
                          <a href={dep.url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-primary-400/70 hover:text-primary-400 truncate block">{dep.url}</a>
                        </div>
                        {dep.totalSize != null && dep.totalSize > 0 && (
                          <span className="text-[10px] text-gray-600">{(dep.totalSize / 1024).toFixed(0)} KB</span>
                        )}
                        <span className="text-[10px] text-gray-600">{new Date(dep.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent deploy activity */}
                <div className="bg-white/[0.02] rounded-xl p-5 border border-canvas-border">
                  <p className="text-xs font-semibold text-canvas-text mb-3">Recent Activity</p>
                  {history.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-canvas-border last:border-0">
                      <span className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-emerald-400' : 'bg-primary-400'}`} />
                      <span className="text-[11px] text-canvas-muted flex-1 truncate">{entry.projectName}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-500/10 text-primary-400'}`}>{entry.status}</span>
                      <span className="text-[10px] text-gray-600">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-xs text-gray-600 py-4 text-center">No activity yet</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════ MONITORING TAB ════════ */}
        {activeTab === 'monitoring' && (
          <div className="max-w-4xl mx-auto p-8">
            <MonitoringDashboard
              projectId={projectId || 'default'}
              className="rounded-xl border border-canvas-border"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeployPanel;
