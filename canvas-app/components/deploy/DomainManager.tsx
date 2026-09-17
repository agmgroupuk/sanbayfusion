/**
 * DomainManager — Custom domain configuration
 * Self-loading: fetches deployments + manages domains via real API
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import deploymentService from '../../services/deploymentService';

type SSLStatus = 'active' | 'pending' | 'error' | 'none';
type DNSStatus = 'verified' | 'pending' | 'error';

export interface CustomDomain {
  id: string;
  domain: string;
  sslStatus: SSLStatus;
  dnsStatus: DNSStatus;
  isPrimary: boolean;
  addedAt: string;
  dnsRecords?: { type: string; name: string; value: string }[];
}

interface DomainManagerProps {
  projectId?: string;
  domains?: CustomDomain[];
  onAdd?: (domain: string) => void;
  onRemove?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onRefreshDNS?: (id: string) => void;
  className?: string;
}

const sslConfig: Record<SSLStatus, { icon: React.FC<any>; color: string; label: string }> = {
  active: { icon: ShieldCheck, color: 'text-emerald-400', label: 'SSL Active' },
  pending: { icon: Shield, color: 'text-amber-400', label: 'SSL Pending' },
  error: { icon: ShieldAlert, color: 'text-primary-400', label: 'SSL Error' },
  none: { icon: Shield, color: 'text-canvas-muted-deep', label: 'No SSL' },
};

const dnsColor: Record<DNSStatus, string> = {
  verified: 'text-emerald-400',
  pending: 'text-amber-400',
  error: 'text-primary-400',
};

const DOMAIN_SUFFIX = '.maula.ai';
const RESERVED_SUBDOMAINS = new Set([
  'www', 'maula', 'app', 'canvas', 'chat', 'demo', 'studio', 'preview',
  'appview', 'spaces', 'api', 'admin', 'mail', 'smtp', 'ftp', 'ns1', 'ns2',
  'cdn', 'static', 'assets', 'img', 'images', 'docs', 'help', 'support',
  'billing', 'pay', 'status', 'blog', 'dev', 'staging', 'test', 'beta',
]);

const DomainManager: React.FC<DomainManagerProps> = ({
  projectId,
  domains: propDomains,
  onAdd: propOnAdd,
  onRemove: propOnRemove,
  onSetPrimary: propOnSetPrimary,
  onRefreshDNS: propOnRefreshDNS,
  className = '',
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Self-managed domain state
  const [localDomains, setLocalDomains] = useState<CustomDomain[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);

  const domains = propDomains || localDomains;

  // Load live deployments to derive default domains
  const loadDeployments = useCallback(async () => {
    setLoading(true);
    try {
      const deps = await deploymentService.listDeployments();
      setDeployments(deps);
      // Create domain entries from live deployments
      const derivedDomains: CustomDomain[] = deps.map((d: any, i: number) => ({
        id: d.id || d.slug,
        domain: d.url ? new URL(d.url).hostname : `${d.slug}.maula.ai`,
        sslStatus: 'active' as SSLStatus,
        dnsStatus: 'verified' as DNSStatus,
        isPrimary: i === 0,
        addedAt: d.createdAt,
        dnsRecords: [
          { type: 'CNAME', name: d.slug || d.name, value: 'apps.maula.ai' },
        ],
      }));
      setLocalDomains(prev => [...derivedDomains, ...prev.filter(d => !derivedDomains.some(dd => dd.domain === d.domain))]);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadDeployments(); }, [loadDeployments]);

  const validateSubdomain = (name: string): string | null => {
    if (!name) return null;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) return 'Only lowercase letters, numbers, and hyphens (no leading/trailing hyphens)';
    if (name.length < 3) return 'Must be at least 3 characters';
    if (name.length > 32) return 'Must be 32 characters or fewer';
    if (RESERVED_SUBDOMAINS.has(name)) return `"${name}" is a reserved system subdomain`;
    const fullDomain = name + DOMAIN_SUFFIX;
    if (domains.some(d => d.domain === fullDomain)) return `"${fullDomain}" is already added`;
    return null;
  };

  const handleAdd = async () => {
    const sub = newDomain.trim().toLowerCase();
    if (!sub) return;
    const err = validateSubdomain(sub);
    if (err) { setValidationError(err); return; }
    const fullDomain = sub + DOMAIN_SUFFIX;
    setAdding(true);
    try {
      const latestDep = deployments[0];
      const deploymentId = latestDep?.id || latestDep?.slug || projectId || 'default';
      const result = await deploymentService.addCustomDomain(deploymentId, fullDomain);
      if (result.success) {
        const d: CustomDomain = {
          id: Date.now().toString(),
          domain: fullDomain,
          sslStatus: 'active',
          dnsStatus: 'verified',
          isPrimary: domains.length === 0,
          addedAt: new Date().toISOString(),
          dnsRecords: result.dnsRecords || [{ type: 'CNAME', name: fullDomain, value: 'apps.maula.ai' }],
        };
        setLocalDomains(prev => [...prev, d]);
        propOnAdd?.(fullDomain);
        setNewDomain('');
        setShowAddForm(false);
        setValidationError(null);
      } else {
        setValidationError(result.error || 'Failed to add domain');
      }
    } catch {
      setValidationError('Failed to add domain');
    }
    setAdding(false);
  };

  const handleRemove = (id: string) => {
    setLocalDomains(prev => prev.filter(d => d.id !== id));
    propOnRemove?.(id);
  };

  const handleSetPrimary = (id: string) => {
    setLocalDomains(prev => prev.map(d => ({ ...d, isPrimary: d.id === id })));
    propOnSetPrimary?.(id);
  };

  const handleRefreshDNS = (id: string) => {
    // Refresh → just reload deployments for now
    loadDeployments();
    propOnRefreshDNS?.(id);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className={`flex flex-col bg-canvas-card rounded-xl border border-canvas-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-canvas-card border-b border-canvas-border flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm text-gray-200 font-medium">Custom Domains</h3>
        <span className="text-[10px] text-gray-600">({domains.length})</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gradient-to-r from-primary-600/20 to-primary-500/20 text-primary-300 border border-primary-500/20 hover:border-primary-500/40 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Domain
        </button>
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
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white/[0.04] border border-canvas-border rounded-lg overflow-hidden focus-within:border-primary-500/30">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^a-z0-9-]/g, '');
                      setNewDomain(v);
                      setValidationError(v ? validateSubdomain(v) : null);
                    }}
                    placeholder="my-app-name"
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-canvas-text font-mono placeholder-gray-600 outline-none min-w-0"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    maxLength={32}
                    autoFocus
                  />
                  <span className="px-3 py-2 text-sm text-canvas-muted-deep font-mono bg-white/[0.03] border-l border-canvas-border shrink-0 select-none">.maula.ai</span>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!newDomain.trim() || adding || !!validationError}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white disabled:opacity-30 hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Add
                </button>
              </div>
              {validationError ? (
                <p className="text-[10px] text-primary-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationError}
                </p>
              ) : (
                <p className="text-[10px] text-gray-600">
                  Your app will be available at <span className="text-canvas-muted font-mono">{newDomain || 'name'}.maula.ai</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Domain list */}
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-2">
            <Globe className="w-6 h-6 opacity-40" />
            <span className="text-xs">No custom domains configured</span>
          </div>
        ) : (
          domains.map((domain) => {
            const ssl = sslConfig[domain.sslStatus];
            const SSLIcon = ssl.icon;
            const isExpanded = expandedId === domain.id;

            return (
              <div key={domain.id}>
                <div
                  className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : domain.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Expand chevron */}
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-canvas-muted-deep" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-canvas-muted-deep" />
                    )}

                    {/* Domain name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-200 font-mono">{domain.domain}</span>
                        {domain.isPrimary && (
                          <span className="px-1.5 py-0 rounded text-[9px] font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-[10px] flex items-center gap-1 ${ssl.color}`}>
                          <SSLIcon className="w-3 h-3" />
                          {ssl.label}
                        </span>
                        <span className={`text-[10px] flex items-center gap-1 ${dnsColor[domain.dnsStatus]}`}>
                          DNS: {domain.dnsStatus}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshDNS(domain.id);
                        }}
                        className="p-1 text-canvas-muted-deep hover:text-canvas-text transition-colors"
                        title="Refresh DNS"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <a
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-canvas-muted-deep hover:text-canvas-text transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {!domain.isPrimary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(domain.id);
                          }}
                          className="p-1 text-canvas-muted-deep hover:text-primary-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* DNS Records */}
                <AnimatePresence>
                  {isExpanded && domain.dnsRecords && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-4 mb-3 p-3 bg-white/[0.02] rounded-lg border border-canvas-border">
                        <h4 className="text-[10px] text-canvas-muted-deep uppercase tracking-wider mb-2">
                          DNS Records
                        </h4>
                        <div className="space-y-2">
                          {domain.dnsRecords.map((record, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-[11px] font-mono"
                            >
                              <span className="w-12 text-primary-400/70 shrink-0">
                                {record.type}
                              </span>
                              <span className="text-canvas-muted truncate flex-1">
                                {record.name}
                              </span>
                              <span className="text-canvas-muted-deep truncate flex-1">
                                {record.value}
                              </span>
                              <button
                                onClick={() =>
                                  copyToClipboard(record.value, `${domain.id}-${i}`)
                                }
                                className="p-0.5 text-gray-600 hover:text-canvas-text transition-colors shrink-0"
                              >
                                {copiedField === `${domain.id}-${i}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>

                        {!domain.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(domain.id)}
                            className="mt-3 w-full py-1.5 rounded-lg text-[11px] text-canvas-muted hover:text-gray-200 bg-white/[0.04] hover:bg-white/[0.06] transition-colors"
                          >
                            Set as Primary Domain
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DomainManager;
