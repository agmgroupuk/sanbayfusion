// Cloud Preview Component - AWS ECS Sandbox-based Preview
// Provides real server execution with npm build and dev server support

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sandboxService, SandboxSession, SandboxFile, OutputCallback } from '../services/sandboxService';
import { ConsoleLine, FileNode } from '../types';

interface CloudPreviewProps {
  projectFiles?: FileNode[];
  onConsoleMessage?: (line: ConsoleLine) => void;
  onDeployComplete?: (url: string) => void;
}

// Flatten FileNode tree to flat array
const flattenProjectFiles = (files: FileNode[], basePath = ''): SandboxFile[] => {
  const result: SandboxFile[] = [];
  
  const process = (items: FileNode[], path: string) => {
    for (const item of items) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if (item.type === 'folder' && item.children) {
        process(item.children, itemPath);
      } else if (item.type === 'file' && item.content !== undefined) {
        result.push({ path: itemPath, content: item.content });
      }
    }
  };
  
  process(files, basePath);
  return result;
};

type Status = 'idle' | 'starting' | 'syncing' | 'installing' | 'building' | 'running' | 'error' | 'deploying';

interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  text: string;
  timestamp: number;
}

const CloudPreview: React.FC<CloudPreviewProps> = ({
  projectFiles,
  onConsoleMessage,
  onDeployComplete,
}) => {
  const [status, setStatus] = useState<Status>('idle');
  const [session, setSession] = useState<SandboxSession | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<ConsoleEntry[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastFilesHash = useRef<string>('');

  // Add console line helper
  const addConsole = useCallback((type: ConsoleEntry['type'], text: string) => {
    const line: ConsoleEntry = { type, text, timestamp: Date.now() };
    setConsoleOutput(prev => [...prev.slice(-500), line]);
    // Convert to maula-editor ConsoleLine format
    onConsoleMessage?.({ 
      text, 
      stream: type === 'error' ? 'stderr' : 'stdout', 
      timestamp: line.timestamp 
    });
  }, [onConsoleMessage]);

  // Subscribe to sandbox output
  useEffect(() => {
    const unsubscribe = sandboxService.onOutput((type, data) => {
      addConsole(type === 'stderr' ? 'error' : type === 'system' ? 'info' : 'log', data);
    });
    return unsubscribe;
  }, [addConsole]);

  // Start sandbox session
  const startSession = async () => {
    setStatus('starting');
    setError(null);
    addConsole('info', '⏳ Starting cloud sandbox...');
    
    try {
      const newSession = await sandboxService.startSession();
      setSession(newSession);
      addConsole('info', `📦 Session ${newSession.sessionId} created, waiting for container...`);
      
      // Wait for container to be ready
      const readySession = await sandboxService.waitForReady();
      setSession(readySession);
      addConsole('info', '✅ Container ready!');
      
      // If we have project files, sync them
      if (projectFiles && projectFiles.length > 0) {
        await syncFiles();
      } else {
        setStatus('running');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      addConsole('error', `❌ Failed to start: ${err.message}`);
    }
  };

  // Sync project files to sandbox
  const syncFiles = async () => {
    if (!session || !projectFiles) return;
    
    setStatus('syncing');
    addConsole('info', '📁 Syncing project files...');
    
    try {
      const files = flattenProjectFiles(projectFiles);
      await sandboxService.initProject(files);
      addConsole('info', `✅ Synced ${files.length} files`);
      
      // Update hash
      lastFilesHash.current = JSON.stringify(files.map(f => f.path + f.content.length));
      
      // Install dependencies
      await installDeps();
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      addConsole('error', `❌ Sync failed: ${err.message}`);
    }
  };

  // Install npm dependencies
  const installDeps = async () => {
    setStatus('installing');
    addConsole('info', '📦 Installing dependencies...');
    
    try {
      const result = await sandboxService.installPackages();
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || 'npm install failed');
      }
      addConsole('info', '✅ Dependencies installed');
      
      // Start dev server
      await startDevServer();
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      addConsole('error', `❌ Install failed: ${err.message}`);
    }
  };

  // Start development server
  const startDevServer = async () => {
    setStatus('building');
    addConsole('info', '🚀 Starting dev server...');
    
    try {
      const result = await sandboxService.startDevServer();
      if (result.started) {
        setPreviewUrl(result.url);
        setStatus('running');
        addConsole('info', `✅ Dev server running at ${result.url}`);
      } else {
        throw new Error('Dev server failed to start');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      addConsole('error', `❌ Dev server failed: ${err.message}`);
    }
  };

  // Stop session
  const stopSession = async () => {
    addConsole('info', '⏹️ Stopping sandbox...');
    await sandboxService.stopSession();
    setSession(null);
    setPreviewUrl(null);
    setStatus('idle');
    addConsole('info', '✅ Sandbox stopped');
  };

  // Deploy to static hosting
  const deployProject = async () => {
    if (!session) return;
    
    setStatus('deploying');
    addConsole('info', '🚀 Deploying to production...');
    
    try {
      // First build
      const buildResult = await sandboxService.build();
      if (!buildResult.success) {
        throw new Error('Build failed');
      }
      addConsole('info', '✅ Build complete');
      
      // Deploy
      const deployResult = await sandboxService.deploy();
      setDeployedUrl(deployResult.url);
      setStatus('running');
      addConsole('info', `🎉 Deployed to ${deployResult.url}`);
      onDeployComplete?.(deployResult.url);
    } catch (err: any) {
      setError(err.message);
      setStatus('running'); // Go back to running, not error
      addConsole('error', `❌ Deploy failed: ${err.message}`);
    }
  };

  // Refresh iframe
  const refreshPreview = () => {
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl;
    }
  };

  // Re-sync files if project files change significantly
  useEffect(() => {
    if (!session || status !== 'running' || !projectFiles) return;
    
    const files = flattenProjectFiles(projectFiles);
    const newHash = JSON.stringify(files.map(f => f.path + f.content.length));
    
    if (newHash !== lastFilesHash.current) {
      // Files changed - sync them
      syncFiles();
    }
  }, [projectFiles, session, status]);

  // Render idle state
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-vscode-bg border-2 border-dashed border-vscode-border rounded-lg m-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mb-4 opacity-30 text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        <p className="text-sm font-bold text-purple-500/80 uppercase tracking-widest mb-4">Cloud Sandbox</p>
        <p className="text-xs text-vscode-textSecondary mb-6 max-w-xs text-center">
          Run your project in a real cloud environment with npm, build tools, and full backend support
        </p>
        <button
          onClick={startSession}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-all flex items-center gap-2"
        >
          <span>☁️</span> Start Cloud Sandbox
        </button>
      </div>
    );
  }

  // Render loading/starting state
  if (status === 'starting' || status === 'syncing' || status === 'installing' || status === 'building') {
    const messages: Record<Status, string> = {
      starting: 'Starting cloud container...',
      syncing: 'Syncing project files...',
      installing: 'Installing npm packages...',
      building: 'Starting dev server...',
      idle: '',
      running: '',
      error: '',
      deploying: '',
    };
    
    return (
      <div className="flex flex-col items-center justify-center h-full bg-vscode-bg/80">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-500 border-t-transparent mb-4"></div>
        <p className="text-sm font-bold text-purple-400 uppercase tracking-widest">{messages[status]}</p>
        <div className="mt-6 max-w-md w-full px-8">
          <div className="bg-vscode-sidebar rounded border border-vscode-border p-3 max-h-40 overflow-y-auto font-mono text-[10px]">
            {consoleOutput.slice(-10).map((line, i) => (
              <div key={i} className={`${
                line.type === 'error' ? 'text-red-400' : 
                line.type === 'info' ? 'text-blue-400' : 'text-vscode-textSecondary'
              }`}>
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-vscode-bg m-4">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-sm font-bold text-red-500 uppercase tracking-widest mb-2">Sandbox Error</p>
        <p className="text-xs text-red-400/80 mb-6 max-w-sm text-center">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={startSession}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium transition-all text-sm"
          >
            Try Again
          </button>
          <button
            onClick={() => setStatus('idle')}
            className="px-4 py-2 bg-vscode-sidebar hover:bg-vscode-border text-vscode-text rounded font-medium transition-all text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Render running state with preview
  return (
    <div className="w-full h-full bg-vscode-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-[10px] text-purple-400 uppercase tracking-wider font-mono">
            ☁️ Cloud Sandbox
          </span>
          {status === 'running' && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Running
            </span>
          )}
          {status === 'deploying' && (
            <span className="flex items-center gap-1 text-[10px] text-yellow-400">
              <span className="animate-spin">⏳</span>
              Deploying...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshPreview}
            className="px-2 py-1 text-[10px] rounded bg-vscode-border hover:bg-vscode-input text-vscode-text transition-all"
            title="Refresh Preview"
          >
            🔄
          </button>
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`px-2 py-1 text-[10px] rounded transition-all ${
              showConsole ? 'bg-cyan-500 text-white' : 'bg-vscode-border hover:bg-vscode-input text-vscode-textSecondary'
            }`}
          >
            📋 Console
          </button>
          <button
            onClick={deployProject}
            disabled={status === 'deploying'}
            className="px-3 py-1 text-[10px] rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-all uppercase tracking-wider font-medium disabled:opacity-50"
          >
            🚀 Deploy
          </button>
          <button
            onClick={stopSession}
            className="px-2 py-1 text-[10px] rounded bg-red-600/80 hover:bg-red-500 text-white transition-all"
            title="Stop Sandbox"
          >
            ⏹️
          </button>
        </div>
      </div>

      {/* Deployed URL Banner */}
      {deployedUrl && (
        <div className="px-4 py-2 bg-emerald-900/30 border-b border-emerald-800/50 flex items-center justify-between">
          <span className="text-xs text-emerald-400">
            🎉 Deployed: <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-300">{deployedUrl}</a>
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(deployedUrl)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300"
          >
            📋 Copy
          </button>
        </div>
      )}

      {/* Preview/Console Split */}
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* Preview iframe */}
        <div className={`${showConsole ? 'w-2/3' : 'w-full'} h-full bg-white`}>
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              title="Cloud Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-vscode-textSecondary">
              <p className="text-sm">Waiting for dev server...</p>
            </div>
          )}
        </div>

        {/* Console Panel */}
        {showConsole && (
          <div className="w-1/3 h-full bg-vscode-panel border-l border-vscode-border flex flex-col">
            <div className="px-3 py-2 border-b border-vscode-border flex items-center justify-between">
              <span className="text-[10px] text-vscode-textSecondary uppercase tracking-wider">Console Output</span>
              <button
                onClick={() => setConsoleOutput([])}
                className="text-[10px] text-vscode-textSecondary hover:text-vscode-text"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-0.5">
              {consoleOutput.map((line, i) => (
                <div
                  key={i}
                  className={`${
                    line.type === 'error' ? 'text-red-400' :
                    line.type === 'warn' ? 'text-yellow-400' :
                    line.type === 'info' ? 'text-blue-400' :
                    'text-vscode-textSecondary'
                  }`}
                >
                  <span className="text-vscode-textSecondary/60 mr-2">{new Date(line.timestamp).toLocaleTimeString()}</span>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudPreview;
