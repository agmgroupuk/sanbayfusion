/**
 * DependenciesPanel — NPM dependencies management
 * Reads package.json from project files via useEditorStore
 */
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useEditorStore } from '../../services/editorBridge';

export interface Dependency {
  name: string;
  version: string;
  latestVersion?: string;
  isDev: boolean;
  description?: string;
  hasUpdate?: boolean;
}

interface DependenciesPanelProps {
  projectId?: string;
  className?: string;
}

function parsePkgJson(content: string): { prod: Dependency[]; dev: Dependency[] } {
  try {
    const pkg = JSON.parse(content);
    const prod = Object.entries(pkg.dependencies || {}).map(([name, version]) => ({
      name, version: String(version), isDev: false,
    }));
    const dev = Object.entries(pkg.devDependencies || {}).map(([name, version]) => ({
      name, version: String(version), isDev: true,
    }));
    return { prod, dev };
  } catch {
    return { prod: [], dev: [] };
  }
}

const DependenciesPanel: React.FC<DependenciesPanelProps> = ({
  projectId,
  className = '',
}) => {
  const files = useEditorStore((s) => s.files);
  const updateFile = useEditorStore((s) => s.updateFile);
  const createFile = useEditorStore((s) => s.createFile);

  const pkgContent = files['/package.json'] || files['package.json'] || '';
  const pkgPath = files['/package.json'] !== undefined ? '/package.json' : 'package.json';

  const { prod: prodDeps, dev: devDeps } = useMemo(() => parsePkgJson(pkgContent), [pkgContent]);
  const dependencies = useMemo(() => [...prodDeps, ...devDeps], [prodDeps, devDeps]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPackage, setNewPackage] = useState('');
  const [isDev, setIsDev] = useState(false);
  const [showDeps, setShowDeps] = useState(true);
  const [showDevDeps, setShowDevDeps] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const filteredProd = prodDeps.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDev = devDeps.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const savePkg = useCallback((newProd: Dependency[], newDev: Dependency[]) => {
    try {
      const pkg = pkgContent ? JSON.parse(pkgContent) : { name: 'my-app', version: '1.0.0' };
      pkg.dependencies = {};
      newProd.forEach(d => { pkg.dependencies[d.name] = d.version; });
      pkg.devDependencies = {};
      newDev.forEach(d => { pkg.devDependencies[d.name] = d.version; });
      const content = JSON.stringify(pkg, null, 2) + '\n';
      if (pkgContent) {
        updateFile(pkgPath, content);
      } else {
        createFile('/package.json', content);
      }
    } catch { }
  }, [pkgContent, pkgPath, updateFile, createFile]);

  const handleAdd = async () => {
    if (!newPackage.trim()) return;
    const name = newPackage.trim().replace(/@[\d^~><=.*]+$/, '');
    setIsInstalling(true);
    try {
      await fetch(`/api/canvas/terminal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ command: `npm install ${isDev ? '-D ' : ''}${newPackage.trim()}`, currentFiles: {} }),
      });
      const newDep: Dependency = { name, version: 'latest', isDev };
      if (isDev) savePkg(prodDeps, [...devDeps, newDep]);
      else savePkg([...prodDeps, newDep], devDeps);
    } catch { }
    setIsInstalling(false);
    setNewPackage('');
    setShowAddForm(false);
  };

  const handleRemove = (depName: string) => {
    savePkg(prodDeps.filter(d => d.name !== depName), devDeps.filter(d => d.name !== depName));
  };

  const DepRow: React.FC<{ dep: Dependency }> = ({ dep }) => (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center px-3 py-1.5 hover:bg-white/[0.02] group"
    >
      <Package className="w-3 h-3 text-gray-600 mr-2 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-canvas-text truncate">{dep.name}</span>
          {dep.hasUpdate && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Update available" />
          )}
        </div>
      </div>

      <span className="text-[10px] text-gray-600 font-mono mr-1">{dep.version}</span>

      {dep.hasUpdate && dep.latestVersion && (
        <span className="text-[10px] text-cyan-400/60 font-mono mr-2">
          → {dep.latestVersion}
        </span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`https://npmjs.com/package/${dep.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition-colors"
          title="View on npm"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={() => handleRemove(dep.name)}
          className="p-0.5 text-canvas-muted-deep hover:text-primary-400 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className={`flex flex-col h-full bg-canvas-card ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-canvas-border flex items-center gap-2">
        <Package className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-xs text-canvas-text font-medium">Dependencies</span>
        <span className="text-[10px] text-gray-600">({dependencies.length})</span>
        <div className="flex-1" />

        {isInstalling && (
          <Loader2 className="w-3 h-3 text-primary-400 animate-spin" />
        )}

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 text-canvas-muted-deep hover:text-primary-400 transition-colors"
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
            placeholder="Search packages..."
            className="flex-1 bg-transparent text-xs text-canvas-text outline-none placeholder-gray-600"
          />
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
                value={newPackage}
                onChange={(e) => setNewPackage(e.target.value)}
                placeholder="package-name or package@version"
                className="w-full bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-1.5 text-xs text-canvas-text font-mono placeholder-gray-600 outline-none focus:border-primary-500/30"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDev}
                    onChange={(e) => setIsDev(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isDev
                        ? 'bg-primary-500/20 border-primary-500/40'
                        : 'bg-white/[0.04] border-canvas-border'
                      }`}
                  >
                    {isDev && <Check className="w-2.5 h-2.5 text-primary-400" />}
                  </div>
                  <span className="text-[10px] text-canvas-muted-deep">Dev dependency</span>
                </label>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 rounded-lg text-[10px] text-canvas-muted hover:text-gray-200 bg-white/[0.04]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newPackage.trim()}
                    className="px-3 py-1 rounded-lg text-[10px] font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white disabled:opacity-30"
                  >
                    Install
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deps lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Production */}
        <div>
          <button
            onClick={() => setShowDeps(!showDeps)}
            className="w-full flex items-center px-3 py-1.5 text-[11px] font-medium text-canvas-muted hover:text-gray-200"
          >
            {showDeps ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
            dependencies
            <span className="ml-1.5 text-[10px] text-gray-600">({filteredProd.length})</span>
          </button>
          <AnimatePresence>
            {showDeps && filteredProd.map((dep) => <DepRow key={dep.name} dep={dep} />)}
          </AnimatePresence>
        </div>

        {/* Dev */}
        <div>
          <button
            onClick={() => setShowDevDeps(!showDevDeps)}
            className="w-full flex items-center px-3 py-1.5 text-[11px] font-medium text-canvas-muted hover:text-gray-200"
          >
            {showDevDeps ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
            devDependencies
            <span className="ml-1.5 text-[10px] text-gray-600">({filteredDev.length})</span>
          </button>
          <AnimatePresence>
            {showDevDeps && filteredDev.map((dep) => <DepRow key={dep.name} dep={dep} />)}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DependenciesPanel;
