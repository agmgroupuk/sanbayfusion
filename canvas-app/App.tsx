import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GeneratedApp,
  ViewMode as LegacyViewMode,
  GenerationState,
  ChatMessage,
  ModelOption,
  ProgrammingLanguage,
  Template,
  FileNode,
} from './types';
import SandpackPreview, { isBackendLanguage, isScriptLanguage } from './components/SandpackPreview';
import CodeView from './components/CodeView';
import CodeEditor from './components/CodeEditor';
import FileTree from './components/FileTree';
import ChatBox from './components/ChatBox';
import TemplatesPanel, { LANGUAGES } from './components/TemplatesPanel';
import TemplatesInlinePanel from './components/TemplatesInlinePanel';
import VoicePanel from './components/sidebar/VoicePanel';
import ImageToCodePanel from './components/sidebar/ImageToCodePanel';
import DeployPanel from './components/DeployPanel';
import AnalyticsDrawer from './components/AnalyticsDrawer';
import PlanStatusBar, { PlanInfo } from './components/PlanStatusBar';
import canvasAppsService from './services/canvasAppsService';
import { editorBridge, useEditorStore } from './services/editorBridge';
import { useEditorSettingsStore } from './stores/editorStore';
import deploymentService from './services/deploymentService';
import authService from './services/authService';
import billingService from './services/billingService';
import { DeploymentPlatform } from './types';
import { Monitor, Tablet, Smartphone, Code, Columns, Mic, Image, Rocket, Edit, Eye, MessageSquare, FolderTree, Clock, LayoutTemplate, Settings, Sparkles, ChevronDown, ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose, Play, CheckCircle, Hammer, FolderOpen, X, Menu, Home, Zap, Globe, Shield, Cpu, BarChart3, FileText, LayoutGrid } from 'lucide-react';
import BuildPanel from './components/editor/BuildPanel';
import AssetBrowser from './components/sidebar/AssetBrowser';

// ── New Component Imports (wiring all 60 components) ──
import GitPanel from './components/sidebar/GitPanel';
import DependenciesPanel from './components/sidebar/DependenciesPanel';
import EnvironmentVars from './components/sidebar/EnvironmentVars';
import DatabasePanel from './components/sidebar/DatabasePanel';
import HistoryPanel from './components/sidebar/HistoryPanel';
import AIAutofix from './components/ai/AIAutofix';
import AIExplain from './components/ai/AIExplain';
import AIRefactor from './components/ai/AIRefactor';
import AITestWriter from './components/ai/AITestWriter';
import UsageDashboard from './components/billing/UsageDashboard';
import InvoiceHistory from './components/billing/InvoiceHistory';
import DeployStatus from './components/deploy/DeployStatus';
import DomainManager from './components/deploy/DomainManager';
import HostingDashboard from './components/deploy/HostingDashboard';
import RollbackPanel from './components/deploy/RollbackPanel';
import MonitoringDashboard from './components/deploy/MonitoringDashboard';
import EditorSettings from './components/editor/EditorSettings';
import EditorStatusBar from './components/editor/EditorStatusBar';
import SearchReplace from './components/editor/SearchReplace';
import PreviewToolbar from './components/preview/PreviewToolbar';
import ConsolePanel from './components/preview/ConsolePanel';
import NetworkPanel from './components/preview/NetworkPanel';
import VideoEditorPanel from './components/video/VideoEditorPanel';
import BillingPanel from './components/sidebar/BillingPanel';
import AIToolsPanel from './components/sidebar/AIToolsPanel';
import ApiTesterPanel from './components/sidebar/ApiTesterPanel';
import SecurityPanel from './components/sidebar/SecurityPanel';
import CloudPanel from './components/sidebar/CloudPanel';
import WorkflowPanel from './components/sidebar/WorkflowPanel';
import DocumentsPanel from './components/sidebar/DocumentsPanel';
import DataSciencePanel from './components/sidebar/DataSciencePanel';
import DevToolPreview, { isDevToolTab } from './components/DevToolPreview';
import ToastContainer, { toast } from './components/shared/Toast';
import PricingPaywall from './components/PricingPaywall';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { GitBranch, Package, KeyRound, Database, Film, CreditCard, Activity, Search, Wrench, Archive, Plus, MoreVertical, Share2, Download, Pencil, Trash2, Copy, Square, Boxes, Cloud, ToggleLeft, ToggleRight, Type, Palette, Bell, HardDrive, Info } from 'lucide-react';

// Preview view mode type (separate from legacy ViewMode)
type PreviewViewMode = 'desktop' | 'tablet' | 'mobile' | 'code' | 'split';

// Left sidebar tab type
type SidebarTab = 'chat' | 'files' | 'quickstart' | 'browse' | 'history' | 'drafts' | 'build' | 'assets' | 'git' | 'deps' | 'env' | 'database' | 'video' | 'monitoring' | 'billing' | 'ai-tools' | 'image-to-code' | 'voice' | 'api' | 'security' | 'cloud' | 'workflow' | 'docs' | 'data' | 'editor-settings';

// Overlay modal type
type ActiveOverlay = 'ai-tools' | 'billing' | 'deploy-status' | 'domains' | 'hosting' | 'rollback' | null;

// AI Models — multiple providers for resilience
const MODELS: ModelOption[] = [
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xAI',
    description: 'Powerful reasoning model. Primary model.',
  },
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'Mistral',
    description: 'Powerful multilingual coding model.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Fast and capable. Great fallback.',
  },
];

const PRESET_TEMPLATES = [
  {
    name: '🚀 SaaS Landing Page',
    prompt: 'Build a modern SaaS landing page for a CRM tool with hero section, features grid, pricing cards, testimonials, and call-to-action.',
  },
  {
    name: '📊 Analytics Dashboard',
    prompt: 'Create a dark-themed analytics dashboard with 3 chart placeholders, stat cards, sidebar navigation, and recent activity list.',
  },
  {
    name: '🛒 Storefront',
    prompt: 'Generate an elegant minimal furniture store with a product grid, cart icon, filters sidebar, and responsive product cards.',
  },
  {
    name: '📝 Blog / CMS',
    prompt: 'Build a modern blog with a post list, featured post hero, category tags, search bar, and responsive article cards with read time.',
  },
  {
    name: '💼 Portfolio',
    prompt: 'Create a minimal developer portfolio with hero section, projects showcase grid, skills with progress bars, and a contact form.',
  },
  {
    name: '🎮 Canvas Game',
    prompt: 'Build an HTML5 canvas space shooter game with player movement, shooting, enemy spawning, collision detection, and score tracking.',
  },
  {
    name: '💬 Chat Interface',
    prompt: 'Create a modern real-time chat UI with message bubbles, user avatars, timestamps, typing indicator, and message input with emoji picker.',
  },
  {
    name: '📋 Task Manager',
    prompt: 'Build a Kanban-style task board with draggable cards, columns for To Do / In Progress / Done, and quick add task functionality.',
  },
  {
    name: '🔐 Auth Pages',
    prompt: 'Create a set of authentication pages: Login, Sign Up, and Forgot Password with form validation, social login buttons, and modern card design.',
  },
  {
    name: '📱 Mobile App UI',
    prompt: 'Build a mobile-first social media app UI with a bottom tab bar, feed with posts, stories row, like/comment interactions, and profile view.',
  },
  {
    name: '🗂️ Admin Panel',
    prompt: 'Create a full admin panel with sidebar, data tables with pagination, user management, settings page, and role-based navigation.',
  },
  {
    name: '🎵 Music Player',
    prompt: 'Build a sleek music player UI with album art, play/pause/skip controls, progress bar, volume slider, and a playlist sidebar.',
  },
];

type ActivePanel = 'workspace' | 'assistant' | 'history' | 'voice' | 'image' | 'deploy' | 'files' | null;
type EditorMode = 'view' | 'edit'; // Toggle between read-only and editable code

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [viewMode, setViewMode] = useState<PreviewViewMode>('desktop');
  const [currentApp, setCurrentApp] = useState<GeneratedApp | null>(null);
  const [history, setHistory] = useState<GeneratedApp[]>([]);
  const [activePanel, setActivePanel] = useState<ActivePanel>('workspace');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
  const toggleSearch = useEditorSettingsStore((s) => s.toggleSearch);
  const editorSettings = useEditorSettingsStore((s) => s.settings);
  const updateEditorSettings = useEditorSettingsStore((s) => s.updateSettings);
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    progressMessage: '',
  });

  // New state for templates and languages
  const [isTemplatesPanelOpen, setIsTemplatesPanelOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage | 'all'>('all');
  const [currentLanguage, setCurrentLanguage] = useState<ProgrammingLanguage>('html');
  // Triggers BackendPreview to auto-start after agent builds a backend app
  const [previewAutoRun, setPreviewAutoRun] = useState(false);
  // Live URL of the active cloud sandbox (shown in PreviewToolbar)
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);

  // Compute the public preview URL for the current app once it has a real DB ID (CUID, not temp Date.now())
  const previewUrl = (() => {
    if (!currentApp?.id) return null;
    if (/^\d+$/.test(currentApp.id)) return null; // temp ID — not yet saved to DB
    const lang = (currentApp.language || currentLanguage || 'html').toLowerCase();
    return `https://preview.sanbayfusion.com/app-${lang}-${currentApp.id}`;
  })();

  // New feature modals
  const [showDeployPanel, setShowDeployPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sessionStart] = useState(() => Date.now());

  // Overlay modals for wired components
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [aiToolsTab, setAiToolsTab] = useState<'autofix' | 'explain' | 'refactor' | 'test'>('autofix');

  // Preview enhancements
  const [showConsolePanel, setShowConsolePanel] = useState(false);
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<any[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const [previewZoom, setPreviewZoom] = useState(1);

  // Undo/Redo version history
  const [codeHistory, setCodeHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  // Git state
  const [gitBranch, setGitBranch] = useState('main');

  // Device mode for preview toolbar
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Editor Bridge state
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [useSurgicalEdits, setUseSurgicalEdits] = useState(true);

  // Streaming chat message (shown live while agent is generating)
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);

  // Sidebar collapse state
  const [leftToolbarOpen, setLeftToolbarOpen] = useState(false);
  const [centerToolbarOpen, setCenterToolbarOpen] = useState(false);
  const [actionsToolbarOpen, setActionsToolbarOpen] = useState(false);
  const [rightToolbarOpen, setRightToolbarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Sidebar discovery animation state
  const [sidebarHighlightIndex, setSidebarHighlightIndex] = useState<number | null>(null);
  const [hasSeenSidebarAnimation, setHasSeenSidebarAnimation] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);


  // Drafts state — saved projects when starting a new chat
  const [drafts, setDrafts] = useState<GeneratedApp[]>([]);
  // History context menu state
  const [historyMenuId, setHistoryMenuId] = useState<string | null>(null);

  // Auth & Plan state
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [activePlan, setActivePlan] = useState<PlanInfo | null>(null);
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  // Video preview state
  const [videoPreview, setVideoPreview] = useState<{ url: string; title: string } | null>(null);
  // Agent state
  const [agentMode, setAgentMode] = useState<'chat' | 'dev' | 'review'>('dev');
  const [agentNotification, setAgentNotification] = useState<{ text: string; type: 'info' | 'warning' | 'error'; id: number } | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{ action: string; description: string; severity: string } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<{ question: string; options: string[] } | null>(null);
  // Small modals — shown when user tries to chat without auth/plan
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);



  // Check auth & plan status on mount
  useEffect(() => {
    const checkAuthAndPlan = async () => {
      setIsCheckingPlan(true);
      try {
        // 1. Verify user session
        const authData = await authService.verify();

        if (!authData.valid || !authData.user) {
          setIsCheckingPlan(false);
          return;
        }

        setAuthUser({ id: authData.user.id, email: authData.user.email });

        // 2. Check for post-checkout redirect (verify purchase)
        const params = new URLSearchParams(window.location.search);
        const purchaseStatus = params.get('purchase');
        const sessionId = params.get('session_id');

        if (purchaseStatus === 'success' && sessionId) {
          try {
            const verifyData = await billingService.verifyPurchase(sessionId);
            if (verifyData.success) {
              setShowThankYou(true);
              setTimeout(() => setShowThankYou(false), 6000);
            }
          } catch (e) {
            // Plan verification failed silently
          }
          // Clean URL params
          window.history.replaceState({}, '', window.location.pathname);
        }

        // 3. Check plan status
        const planData = await billingService.checkPlan();

        if (planData.success && planData.hasAccess && planData.plan) {
          setActivePlan(planData.plan);
        }
      } catch (e) {
        console.error('Auth/plan check error:', e);
      } finally {
        setIsCheckingPlan(false);
      }
    };

    checkAuthAndPlan();
  }, []);

  // Load apps from database (DB only)
  useEffect(() => {
    const loadApps = async () => {
      setIsLoadingHistory(true);
      try {
        const apps = await canvasAppsService.getApps();
        setHistory(apps);
      } catch (e) {
        console.error('[App] Failed to load apps:', e);
        setHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadApps();
  }, []);

  // Sync editorBridge with currentApp code
  useEffect(() => {
    if (currentApp?.code) {
      editorBridge.loadFromCode(currentApp.code, currentLanguage);
      setProjectFiles(editorBridge.getProjectTree());
      // Set active file to first file if not set
      if (!activeFilePath) {
        const paths = editorBridge.getAllFilePaths();
        if (paths.length > 0) {
          setActiveFilePath(paths[0]);
        }
      }
    }
  }, [currentApp?.code, currentLanguage]);

  // Listen to editorBridge file changes
  useEffect(() => {
    const handleFileChange = (path: string, content: string) => {
      setProjectFiles(editorBridge.getProjectTree());
      // Sync back to currentApp if in edit mode
      if (editorMode === 'edit' && currentApp) {
        const newCode = editorBridge.toCode();
        setCurrentApp(prev => prev ? { ...prev, code: newCode } : null);
      }
    };
    const unsubscribe = editorBridge.onFileChange(handleFileChange);
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [editorMode, currentApp]);

  // Push code snapshot to undo/redo history when code changes meaningfully
  useEffect(() => {
    const code = currentApp?.code;
    if (!code || isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    setCodeHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1);
      if (truncated[truncated.length - 1] === code) return prev;
      const next = [...truncated, code];
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [currentApp?.code]);

  // Undo/Redo handlers
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < codeHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo || !currentApp) return;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const prevCode = codeHistory[newIndex];
    const updatedApp = { ...currentApp, code: prevCode };
    setCurrentApp(updatedApp);
    editorBridge.loadFromCode(prevCode, currentLanguage);
    setProjectFiles(editorBridge.getProjectTree());
  }, [canUndo, historyIndex, codeHistory, currentApp, currentLanguage]);

  const handleRedo = useCallback(() => {
    if (!canRedo || !currentApp) return;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const nextCode = codeHistory[newIndex];
    const updatedApp = { ...currentApp, code: nextCode };
    setCurrentApp(updatedApp);
    editorBridge.loadFromCode(nextCode, currentLanguage);
    setProjectFiles(editorBridge.getProjectTree());
  }, [canRedo, historyIndex, codeHistory, currentApp, currentLanguage]);

  // Refresh preview handler
  const handleRefreshPreview = useCallback(() => {
    const iframe = document.querySelector('iframe[title="Preview"]') as HTMLIFrameElement;
    if (iframe) {
      // Re-set srcdoc to force refresh
      const current = iframe.srcdoc;
      iframe.srcdoc = '';
      requestAnimationFrame(() => { iframe.srcdoc = current; });
    }
  }, []);

  // Listen for console/network messages from iframe preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'console-entry') {
        setConsoleEntries(prev => [...prev, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level: data.level || 'log',
          message: typeof data.args === 'string' ? data.args : JSON.stringify(data.args),
          timestamp: Date.now(),
          source: data.source,
          line: data.line,
        }]);
      }

      if (data.type === 'network-entry') {
        if (data.action === 'start') {
          setNetworkRequests(prev => [...prev, {
            id: data.id,
            method: data.method || 'GET',
            url: data.url || '',
            status: null,
            requestStatus: 'pending' as const,
            size: null,
            time: null,
            type: 'fetch' as const,
            timestamp: Date.now(),
          }]);
        } else if (data.action === 'end') {
          setNetworkRequests(prev => prev.map(r => r.id === data.id ? {
            ...r,
            status: data.status,
            requestStatus: (data.status && data.status < 400 ? 'success' : 'error') as any,
            size: data.size ?? null,
            time: data.time ?? null,
          } : r));
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sidebar discovery animation - runs once per session
  useEffect(() => {
    if (hasSeenSidebarAnimation) return;

    // Animation sequence: highlight each sidebar item with delay
    const sidebarItems = ['logo', 'workspace', 'assistant', 'history', 'settings'];
    let currentIndex = 0;

    const animateNext = () => {
      if (currentIndex < sidebarItems.length) {
        setSidebarHighlightIndex(currentIndex);
        currentIndex++;
        setTimeout(animateNext, 600);
      } else {
        // Animation complete
        setSidebarHighlightIndex(null);
        setHasSeenSidebarAnimation(true);
      }
    };

    // Start animation after a short delay
    const startTimer = setTimeout(() => {
      animateNext();
    }, 1000);

    return () => clearTimeout(startTimer);
  }, []);

  // Save app to database (DB only — no localStorage)
  const saveApp = useCallback(async (app: GeneratedApp, isNew: boolean = false) => {
    try {
      if (isNew) {
        const savedApp = await canvasAppsService.saveApp(app);
        setHistory(prev => [savedApp, ...prev.filter(a => a.id !== savedApp.id)]);
        // Update currentApp with the DB-assigned ID so future updates use the real ID
        setCurrentApp(prev => prev && prev.id === app.id ? { ...prev, id: savedApp.id } : prev);
      } else {
        const updatedApp = await canvasAppsService.updateApp(app.id, app);
        setHistory(prev => prev.map(a => a.id === app.id || a.id === updatedApp.id ? updatedApp : a));
        // If updateApp upserted (404 → POST), the returned ID may differ from the local timestamp ID
        if (updatedApp.id !== app.id) {
          setCurrentApp(prev => prev && prev.id === app.id ? { ...prev, id: updatedApp.id } : prev);
        }
      }
    } catch (error) {
      console.error('[App] Save error:', error);
    }
  }, []);

  // Legacy saveHistory for compatibility (no longer writes directly to localStorage)
  const saveHistory = useCallback((newHistory: GeneratedApp[]) => {
    setHistory(newHistory);
  }, []);

  // Handle starting a new chat — save current project to drafts and reset
  const handleNewChat = useCallback(() => {
    if (currentApp) {
      setDrafts(prev => {
        const exists = prev.some(d => d.id === currentApp.id);
        if (exists) return prev;
        return [currentApp, ...prev];
      });
    }
    setCurrentApp(null);
    setPrompt('');
    editorBridge.loadFromCode('', 'html');
    setProjectFiles([]);
    setActiveFilePath(null);
    setViewMode('desktop');
  }, [currentApp]);

  // Handle restoring a draft
  const handleRestoreDraft = useCallback((draft: GeneratedApp) => {
    setCurrentApp(draft);
    setDrafts(prev => prev.filter(d => d.id !== draft.id));
    setSidebarTab('chat');
    // Restore files into editor bridge
    if (draft.code) {
      editorBridge.loadFromCode(draft.code, draft.language || 'html');
      setProjectFiles(editorBridge.getProjectTree());
      const paths = editorBridge.getAllFilePaths();
      setActiveFilePath(paths[0] || null);
    }
  }, []);

  // Handle deleting a draft
  const handleDeleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  }, []);

  // Handle deleting a history entry
  const handleDeleteHistoryEntry = useCallback(async (appId: string) => {
    try {
      await canvasAppsService.deleteApp(appId);
      setHistory(prev => prev.filter(a => a.id !== appId));
      if (currentApp?.id === appId) {
        setCurrentApp(null);
      }
    } catch (error) {
      console.error('[App] Delete error:', error);
    }
  }, [currentApp]);

  // Handle downloading a project as HTML file
  const handleDownloadProject = useCallback((app: GeneratedApp) => {
    const blob = new Blob([app.code || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Handle sharing — copy project info to clipboard
  const handleShareProject = useCallback(async (app: GeneratedApp) => {
    const shareText = `${app.name}\n\nPrompt: ${app.prompt}\n\nGenerated with GenCraft Pro`;
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Fallback noop
    }
  }, []);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  // Gate helper — called before any action that requires login + plan
  const requireAuth = (action: () => void) => {
    if (!authUser) { setShowLoginModal(true); return; }
    if (!activePlan) { setShowPurchaseModal(true); return; }
    action();
  };

  // Handle messages from AI Assistant chat
  const handleChatMessage = async (text: string, attachments?: import('./components/ChatBox').ChatAttachment[], mode: 'agent' | 'chat' = 'agent') => {
    if ((!text.trim() && (!attachments || attachments.length === 0)) || genState.isGenerating) return;

    // Auth gate — show small login modal
    if (!authUser) {
      setShowLoginModal(true);
      return;
    }

    // Plan gate — show small purchase modal
    if (!activePlan) {
      setShowPurchaseModal(true);
      return;
    }

    // In agent mode, switch to code view so user sees files being created live
    if (mode === 'agent') {
      setViewMode('code');
      setEditorMode('edit');
    }
    setSidebarTab('chat');
    setLeftPanelOpen(true);

    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: 'Nova is thinking...',
    });

    try {
      // ── Upload attachments if any ──
      let uploadedFiles: { name: string; size: number; type: string; url: string; textContent?: string }[] = [];
      if (attachments && attachments.length > 0) {
        setGenState({ isGenerating: true, error: null, progressMessage: 'Uploading files...' });
        const formData = new FormData();
        for (const a of attachments) {
          formData.append('files', a.file);
        }
        try {
          const uploadRes = await fetch('/api/canvas/upload-chat-files', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.files) {
            uploadedFiles = uploadData.files;
          }
        } catch (uploadErr) {
          console.warn('[ChatUpload] File upload failed, continuing without files:', uploadErr);
        }
        setGenState({ isGenerating: true, error: null, progressMessage: 'Nova is thinking...' });
      }

      const attachmentMeta = uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type, url: f.url }));
      const userMsg: ChatMessage = {
        role: 'user',
        text: text || (uploadedFiles.length > 0 ? `[Uploaded ${uploadedFiles.length} file(s): ${uploadedFiles.map(f => f.name).join(', ')}]` : ''),
        timestamp: Date.now(),
        attachments: attachmentMeta.length > 0 ? attachmentMeta : undefined,
      };

      // ── AI Agent Chat ──
      const allFiles = editorBridge.toProjectFiles();
      const currentFiles: Record<string, string> = {};
      allFiles.forEach((f: { path: string; content: string }) => { currentFiles[f.path] = f.content; });

      // Append uploaded document content to the message for AI context
      let messageWithContext = text;
      if (uploadedFiles.length > 0) {
        const textAttachments = uploadedFiles.filter(f => f.textContent);
        if (textAttachments.length > 0) {
          messageWithContext += '\n\n--- Attached Files ---\n';
          for (const f of textAttachments) {
            messageWithContext += `\n### ${f.name}\n\`\`\`\n${f.textContent}\n\`\`\`\n`;
          }
        }
      }

      const chatResponse = await (async () => {
        // ── SSE Streaming to /agent-chat-stream ──
        const existingFiles = new Set(editorBridge.getAllFilePaths());
        const fileActions: import('./types').FileAction[] = [];
        let filesModified = false;
        let streamedText = '';

        // Add userMsg to history immediately so the user's message shows in chat
        if (currentApp) {
          const updatedApp = { ...currentApp, history: [...currentApp.history, userMsg] };
          setCurrentApp(updatedApp);
        } else {
          const newApp: GeneratedApp = {
            id: Date.now().toString(),
            name: text.substring(0, 30) + '...',
            code: '',
            prompt: text,
            timestamp: Date.now(),
            history: [userMsg],
            language: currentLanguage,
          };
          setCurrentApp(newApp);
        }

        const sseRes = await fetch('/api/canvas/agent-chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': 'standalone' },
          credentials: 'include',
          body: JSON.stringify({
            message: messageWithContext,
            conversationHistory: (currentApp?.history?.slice(-20) || []),
            currentFiles: mode === 'agent' ? currentFiles : undefined,
            language: currentLanguage,
            mode,
            ...(sandboxUrl ? { previewSessionId: sandboxUrl.match(/\/api\/canvas\/preview\/([^/]+)/)?.[1] } : {}),
          }),
        });

        if (sseRes.status === 401) throw new Error('AUTH_REQUIRED');
        if (sseRes.status === 403) throw new Error('PLAN_REQUIRED');
        if (!sseRes.ok) {
          const errData = await sseRes.json().catch(() => ({ error: 'Stream failed' }));
          throw new Error(errData.error || 'Chat request failed');
        }

        const reader = sseRes.body?.getReader();
        if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder();
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          // Keep the last partial line in the buffer
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let evt: any;
            try { evt = JSON.parse(line.slice(6)); } catch { continue; }

            switch (evt.type) {
              case 'thinking':
                setGenState({ isGenerating: true, error: null, progressMessage: evt.message || 'Nova is thinking...' });
                break;

              case 'round':
                setGenState({ isGenerating: true, error: null, progressMessage: `Working... (round ${evt.round})` });
                break;

              case 'tool_start':
                setGenState({ isGenerating: true, error: null, progressMessage: `Running ${evt.name}...` });
                break;

              case 'tool_result': {
                // Live file creation/update — update FileTree + code preview immediately
                const result = evt.result;
                if (result?.success && result?.path && result?.content !== undefined) {
                  const filePath = result.path.startsWith('/') ? result.path : `/${result.path}`;
                  const isNew = !existingFiles.has(filePath);
                  if (isNew) {
                    editorBridge.createFile(filePath, result.content);
                    existingFiles.add(filePath);
                  } else {
                    editorBridge.updateFile(filePath, result.content);
                  }
                  fileActions.push({
                    path: filePath,
                    action: isNew ? 'created' : 'modified',
                    lineCount: (result.content as string).split('\n').length,
                  });
                  filesModified = true;
                  // LIVE update — file tree and code preview refresh immediately
                  setProjectFiles(editorBridge.getProjectTree());
                  // Auto-open the newly created/modified file in the editor
                  setActiveFilePath(filePath);
                }
                // Handle delete_file tool results
                if (result?.success && evt.name === 'delete_file' && evt.arguments?.path) {
                  const filePath = evt.arguments.path.startsWith('/') ? evt.arguments.path : `/${evt.arguments.path}`;
                  editorBridge.deleteFile(filePath);
                  fileActions.push({ path: filePath, action: 'deleted' });
                  filesModified = true;
                  setProjectFiles(editorBridge.getProjectTree());
                }
                // ── UI Event tools (notifications, approval, ask_user) ──
                if (result?._uiEvent === 'notification') {
                  const toastType = result.notificationType as 'info' | 'warning' | 'error';
                  const toastTitle = toastType === 'error' ? 'Error' : toastType === 'warning' ? 'Warning' : 'Nova';
                  toast[toastType === 'info' ? 'info' : toastType === 'warning' ? 'warning' : 'error'](
                    toastTitle,
                    result.text as string,
                    result.duration as number,
                  );
                }
                if (result?._uiEvent === 'approval') {
                  setPendingApproval({
                    action: result.action as string,
                    description: result.description as string,
                    severity: (result.severity as string) || 'medium',
                  });
                  // Auto-dismiss after 5s (already approved server-side)
                  setTimeout(() => setPendingApproval(null), 5000);
                }
                if (result?._uiEvent === 'ask_user') {
                  setPendingQuestion({
                    question: result.question as string,
                    options: (result.options as string[]) || [],
                  });
                }
                break;
              }

              case 'text_delta':
                streamedText += evt.text || '';
                // Show live streaming message in chat
                setStreamingMessage({
                  role: 'model',
                  text: streamedText,
                  timestamp: Date.now(),
                  fileActions: fileActions.length > 0 ? [...fileActions] : undefined,
                });
                break;

              case 'done':
                // Final message from agent
                streamedText = evt.message || streamedText || 'Done!';
                break;

              case 'error':
                throw new Error(evt.message || 'Agent chat failed.');
            }
          }
        }

        // Clear streaming message — will be replaced by final history entry
        setStreamingMessage(null);

        return {
          message: streamedText,
          filesModified,
          fileActions,
        };
      })().catch((err: Error) => {
        if (err.message === 'AUTH_REQUIRED') {
          setGenState({ isGenerating: false, error: null, progressMessage: '' });
          setAuthUser(null);
          setShowLoginModal(true);
          return null;
        }
        if (err.message === 'PLAN_REQUIRED') {
          setGenState({ isGenerating: false, error: null, progressMessage: '' });
          setShowPurchaseModal(true);
          return null;
        }
        throw err;
      });

      if (!chatResponse) return; // Auth/Plan error handled above

      // Strip raw code blocks — code goes to editor, not the chat
      const stripCodeBlocks = (t: string) =>
        t.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();

      // When files were changed, strip verbose file-listing sections from the AI text.
      // The FileActionsCard already shows exactly what changed — no need to repeat it.
      const cleanMessageText = (t: string, hasFiles: boolean): string => {
        let cleaned = stripCodeBlocks(t);
        if (!hasFiles) return cleaned;

        // Split into lines, keep only leading conversational sentences before any
        // numbered/bulleted file summaries or markdown headers appear.
        const lines = cleaned.split('\n');
        const stopPatterns = [
          /^\s*#+\s/,                          // ## Summary of Changes
          /^\*\*Summary/i,                     // **Summary of Changes**
          /^\d+\.\s+(Created|Edited|Modified|Deleted|Added|Removed|Updated)\s/i,
          /^(Created|Edited|Modified|Deleted|Added|Removed|Updated)\s+Files?:/i,
          /^Here('s| are| is)\s+(what|the\s+(files|changes|summary))/i,
          /^The following files/i,
          /^I('ve| have)\s+(created|built|written|updated|modified|deleted)/i,
        ];

        const kept: string[] = [];
        for (const line of lines) {
          if (stopPatterns.some(p => p.test(line))) break;
          kept.push(line);
        }

        const result = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        // If nothing meaningful survived, return a clean short fallback
        return result.length > 3 ? result : '✅ Done! Files are updated in the editor and preview.';
      };

      // AI response with file action metadata
      const { filesModified, fileActions } = chatResponse;
      const modelMsg: ChatMessage = {
        role: 'model',
        text: cleanMessageText(chatResponse.message || 'Done!', fileActions.length > 0),
        timestamp: Date.now(),
        fileActions: fileActions.length > 0 ? fileActions : undefined,
      };

      // Save to app state
      if (filesModified) {
        const files = useEditorStore.getState().files;
        const mainCode = files['/index.html'] || files['index.html'] || Object.values(files)[0] || '';

        if (currentApp) {
          const updatedApp = { ...currentApp, code: mainCode, history: [...currentApp.history, modelMsg] };
          setCurrentApp(updatedApp);
          saveApp(updatedApp, false);
        } else {
          const newApp: GeneratedApp = {
            id: Date.now().toString(),
            name: text.substring(0, 30) + '...',
            code: mainCode,
            prompt: text,
            timestamp: Date.now(),
            history: [userMsg, modelMsg],
            language: currentLanguage,
          };
          setCurrentApp(newApp);
          saveApp(newApp, true);
        }
        setProjectFiles(editorBridge.getProjectTree());

        // Auto-detect language from generated files and switch to backend preview if needed
        const detectedLang = detectLanguageFromFiles(files);
        const effectiveLang = detectedLang || currentLanguage;
        if (detectedLang && detectedLang !== currentLanguage) {
          setCurrentLanguage(detectedLang);
        }
        // Switch to live preview so user sees the built app immediately
        setViewMode('desktop');
        if (isBackendLanguage(effectiveLang) || isScriptLanguage(effectiveLang)) {
          // Backend/script languages need auto-run to start the server process
          setPreviewAutoRun(true);
        }

        // Keep Chat panel open so user sees the agent response alongside the editor
        setSidebarTab('chat');
        setLeftPanelOpen(true);
      } else {
        if (currentApp) {
          const updatedApp = { ...currentApp, history: [...currentApp.history, modelMsg] };
          setCurrentApp(updatedApp);
          saveApp(updatedApp, false);
        } else {
          setCurrentApp({
            id: Date.now().toString(),
            name: text.substring(0, 30) + '...',
            code: '',
            prompt: text,
            timestamp: Date.now(),
            history: [userMsg, modelMsg],
            language: currentLanguage,
          });
        }
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '' });
    } catch (err: any) {
      setStreamingMessage(null);
      setGenState({
        isGenerating: false,
        error: err.message,
        progressMessage: '',
      });
    }
  };

  // Handle deploy completion callback from DeployPanel
  const handleDeployComplete = (url: string, platform: DeploymentPlatform) => {
    if (currentApp) {
      const deployMsg: ChatMessage = {
        role: 'model',
        text: `🚀 Deployed successfully to ${platform}!\n${url}`,
        timestamp: Date.now(),
      };
      const updatedApp = {
        ...currentApp,
        history: [...currentApp.history, deployMsg],
        deployedUrl: url,
      };
      setCurrentApp(updatedApp);
      saveApp(updatedApp, false);
    }
  };

  // Handle build error fix request from DeployPanel
  const handleFixBuildError = async (error: string, buildLogs: string[]) => {
    if (!currentApp) return;

    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: 'AI is analyzing and fixing build errors...',
    });

    try {
      const files = useEditorStore.getState().files;
      const fix = await deploymentService.requestBuildFix(error, buildLogs, files);

      if (fix && fix.fixedFiles) {
        // Apply all fixes and track actions
        const fixFileActions: import('./types').FileAction[] = [];
        for (const [path, content] of Object.entries(fix.fixedFiles)) {
          const filePath = path.startsWith('/') ? path : `/${path}`;
          const exists = editorBridge.getFile(filePath) !== undefined;
          if (exists) {
            editorBridge.updateFile(filePath, content);
          } else {
            editorBridge.createFile(filePath, content);
          }
          fixFileActions.push({ path: filePath, action: exists ? 'modified' : 'created' });
        }
        setProjectFiles(editorBridge.getProjectTree());

        const newCode = editorBridge.toCode();
        const fixMsg: ChatMessage = {
          role: 'model',
          text: `**Build Error Fixed**\n${fix.explanation}`,
          timestamp: Date.now(),
          fileActions: fixFileActions.length > 0 ? fixFileActions : undefined,
        };
        const updatedApp = {
          ...currentApp,
          code: newCode,
          history: [...currentApp.history, fixMsg],
        };
        setCurrentApp(updatedApp);
        saveApp(updatedApp, false);
      } else {
        throw new Error('AI could not generate a fix. Try deploying again or modifying the code manually.');
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '' });
    } catch (err: any) {
      setGenState({
        isGenerating: false,
        error: err.message,
        progressMessage: '',
      });
    }
  };

  // Handle template selection from templates panel
  const handleUseTemplate = (template: Template) => {
    setPrompt(template.prompt);
    setCurrentLanguage(template.language);
    setIsTemplatesPanelOpen(false);
    setActivePanel('workspace');
  };

  // Detect language from a set of generated files so the preview can auto-select
  // the right runtime even when no template was explicitly chosen.
  const detectLanguageFromFiles = (files: Record<string, string>): ProgrammingLanguage | null => {
    const paths = Object.keys(files);
    const hasPy = paths.some(p => p.endsWith('.py'));
    const hasGo = paths.some(p => p.endsWith('.go') || p.endsWith('go.mod'));
    const hasPhp = paths.some(p => p.endsWith('.php'));
    const hasRuby = paths.some(p => p.endsWith('.rb') || p.endsWith('.ru') || p === '/Gemfile' || p === 'Gemfile');

    if (hasPy) {
      // Scan ONLY .py file content — never .txt/.md to avoid false positives
      const content = Object.entries(files)
        .filter(([p]) => p.endsWith('.py'))
        .map(([, c]) => c)
        .join('\n')
        .slice(0, 8000);

      // Django: needs explicit manage.py file OR django import
      if (paths.some(p => /[/\\]?manage\.py$/.test(p)) ||
        /^from django\b|^import django\b/m.test(content)) return 'django';
      // FastAPI: specific import
      if (/^from fastapi\b|^import fastapi\b/m.test(content)) return 'fastapi';
      // Flask: specific import AND app.route or Flask() usage — real web server
      if (/^from flask\b|^import flask\b/m.test(content) &&
        /Flask\(|\.route\(|@app\./m.test(content)) return 'flask';
      // Anything else with .py → plain script (pandas, numpy, ML, CLI, etc.)
      return 'python';
    }

    if (hasGo) return 'go';
    if (hasPhp) {
      const content = Object.entries(files).filter(([p]) => p.endsWith('.php')).map(([, c]) => c).join('\n').slice(0, 3000);
      if (/laravel|artisan/i.test(content) || paths.some(p => p.endsWith('artisan'))) return 'laravel';
      return 'php';
    }
    if (hasRuby) {
      const content = Object.entries(files).filter(([p]) => p.endsWith('.rb') || p.endsWith('.ru')).map(([, c]) => c).join('\n').slice(0, 3000);
      if (/rails/i.test(content)) return 'rails';
      return 'ruby';
    }

    // Node.js / TypeScript server — only if there's a server-like entry file but no HTML/JSX/TSX
    const serverJsFiles = paths.filter(p =>
      (p.endsWith('.js') || p.endsWith('.ts')) &&
      /server|index|app|main/i.test(p.split('/').pop() || '')
    );
    if (serverJsFiles.length > 0 && !paths.some(p => p.endsWith('.html') || p.endsWith('.jsx') || p.endsWith('.tsx'))) {
      const content = serverJsFiles.map(p => files[p] || '').join('\n').slice(0, 6000);
      if (/fastify|express/i.test(content) && /\.listen\(/.test(content)) return 'express';
      if (serverJsFiles.some(p => p.endsWith('.ts'))) return 'typescript';
      return 'nodejs';
    }

    return null;
  };

  // Get language-specific system prompt addition
  const getLanguagePromptAddition = (lang: ProgrammingLanguage): string => {
    const languagePrompts: Partial<Record<ProgrammingLanguage, string>> = {
      html: 'Generate a complete, self-contained HTML file with embedded CSS and JavaScript. The output should start with <!DOCTYPE html>.',
      javascript: 'Generate clean, modern JavaScript code with ES6+ syntax. Include comments explaining key parts.',
      typescript: 'Generate TypeScript code with proper type annotations and interfaces. Include JSDoc comments.',
      python: 'Generate clean Python 3 code following PEP 8 style guidelines. Include docstrings and type hints.',
      react: 'Generate a React functional component with hooks. Use TypeScript and Tailwind CSS classes. Export the component.',
      nextjs: 'Generate Next.js 14 code using App Router with TypeScript. Use Server Components where appropriate.',
      vue: 'Generate a Vue 3 component using Composition API with TypeScript and <script setup> syntax.',
      svelte: 'Generate a Svelte component with TypeScript support.',
      css: 'Generate modern CSS with custom properties, flexbox/grid, and responsive design.',
      tailwind: 'Generate HTML with Tailwind CSS classes. Use utility-first approach with proper responsive classes.',
      nodejs: 'Generate Node.js code with ES modules (import/export). Include error handling and async/await.',
      express: 'Generate Express.js code with proper middleware, routing, and error handling.',
      sql: 'Generate SQL code compatible with PostgreSQL. Include proper constraints and indexes.',
      bash: 'Generate a Bash script with proper shebang, error handling, and comments.',
      json: 'Generate properly formatted JSON with appropriate structure.',
      markdown: 'Generate well-structured Markdown with proper headings, lists, and formatting.',
      angular: 'Generate Angular component with TypeScript. Use standalone components and signals where appropriate.',
      sass: 'Generate SCSS/Sass code with proper nesting, variables, and mixins.',
      fastapi: 'Generate FastAPI code with type hints, Pydantic models, and async endpoints.',
      django: 'Generate Django code following Django best practices with models, views, and templates.',
      flask: 'Generate Flask application code with proper blueprints and error handling.',
      java: 'Generate Java code following modern Java conventions with proper OOP patterns.',
      spring: 'Generate Spring Boot code with annotations, dependency injection, and REST controllers.',
      go: 'Generate Go code following Go idioms with proper error handling and goroutines.',
      rust: 'Generate Rust code with proper ownership, borrowing, and error handling patterns.',
      csharp: 'Generate C# code with modern .NET conventions, async/await, and LINQ.',
      dotnet: 'Generate .NET code with proper project structure and dependency injection.',
      php: 'Generate modern PHP 8+ code with type declarations and named arguments.',
      laravel: 'Generate Laravel code with Eloquent models, controllers, and blade templates.',
      ruby: 'Generate Ruby code following Ruby style conventions and best practices.',
      rails: 'Generate Ruby on Rails code with proper MVC structure and Active Record.',
      postgresql: 'Generate PostgreSQL-specific SQL with advanced features like CTEs and window functions.',
      mongodb: 'Generate MongoDB queries and aggregation pipelines with proper indexing.',
      prisma: 'Generate Prisma schema and client code with proper relations and types.',
      graphql: 'Generate GraphQL schema definitions with resolvers and type definitions.',
      reactnative: 'Generate React Native code with proper native components and navigation.',
      flutter: 'Generate Flutter/Dart code with proper widget composition and state management.',
      swift: 'Generate Swift code with proper protocols, optionals, and SwiftUI patterns.',
      kotlin: 'Generate Kotlin code with coroutines, data classes, and null safety.',
      docker: 'Generate Dockerfile and docker-compose.yml with proper multi-stage builds.',
      kubernetes: 'Generate Kubernetes YAML manifests with proper resource definitions.',
      terraform: 'Generate Terraform HCL code with proper provider configuration and modules.',
      powershell: 'Generate PowerShell script with proper cmdlets and error handling.',
      yaml: 'Generate properly structured YAML with appropriate indentation.',
      xml: 'Generate well-formed XML with proper namespaces and schema.',
      jupyter: 'Generate Jupyter notebook cells with proper markdown and code cells.',
      r: 'Generate R code with tidyverse conventions and proper data manipulation.',
    };
    return languagePrompts[lang] || '';
  };

  // Helper function for sidebar animation classes
  const getSidebarItemClass = (index: number, baseClass: string, activeClass: string, inactiveClass: string, isActive: boolean) => {
    const isHighlighted = sidebarHighlightIndex === index && !hasSeenSidebarAnimation;
    const highlightClass = isHighlighted
      ? 'animate-pulse ring-2 ring-indigo-400 ring-opacity-75 scale-110 bg-indigo-600/30 text-indigo-300'
      : '';
    return `${baseClass} ${isActive ? activeClass : inactiveClass} ${highlightClass}`;
  };


  return (
    <div className="flex flex-col h-screen bg-canvas-main text-canvas-text overflow-hidden">
      {/* Small Login Modal — shown when user tries to chat without being logged in */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}>
          <div className="bg-canvas-card border border-canvas-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center overflow-hidden p-1.5">
                  <img src="/logo.png" alt="Maula AI" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-white font-bold text-lg">Sign In Required</h3>
              </div>
              <button onClick={() => setShowLoginModal(false)} className="text-canvas-muted-deep hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-canvas-muted text-sm mb-5">Sign in to start building apps with AI. It's free to create an account!</p>
            <div className="flex flex-col gap-2.5">
              <a href="https://sanbayfusion.com/auth/login?redirect=https%3A%2F%2Fcanvas.sanbayfusion.com" className="w-full py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all text-center text-sm">Log In</a>
              <a href="https://sanbayfusion.com/auth/signup?redirect=https%3A%2F%2Fcanvas.sanbayfusion.com" className="w-full py-2.5 px-4 bg-white/5 border border-canvas-border text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-center text-sm">Create Free Account</a>
            </div>
          </div>
        </div>
      )}

      {/* Small Purchase Modal — shown when logged in but no active plan */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)}>
          <div className="bg-canvas-card border border-canvas-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">Plan Required</h3>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="text-canvas-muted-deep hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-canvas-muted text-sm mb-2">Get a GenCraft Pro plan to unlock AI app building.</p>
            <div className="flex items-center gap-4 text-xs text-canvas-muted-deep mb-5">
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" />Unlimited AI generations</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" />All AI models</span>
            </div>
            <a href="https://sanbayfusion.com/canvas-studio-pricing" className="block w-full py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all text-center text-sm shadow-lg shadow-primary-500/20">View Plans & Pricing →</a>
          </div>
        </div>
      )}

      {/* Thank You Toast — shows after successful Stripe checkout */}
      {showThankYou && (
        <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-canvas-card border border-primary-500/30 rounded-2xl p-5 shadow-2xl shadow-primary-500/10 max-w-sm">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1">🎉 Welcome to GenCraft Pro!</h3>
                <p className="text-canvas-muted text-xs leading-relaxed">Your plan is now active. Start building amazing apps with AI — describe what you want below!</p>
              </div>
            </div>
            <div className="mt-3 w-full bg-white/5 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-[shrink_6s_linear_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BRANDED DRAWER — Full-screen Neural Interface overlay */}
      {/* ============================================================ */}
      <div
        className={`fixed inset-0 z-[200] transition-all duration-700 ease-[cubic-bezier(0.7,0,0.3,1)] flex flex-col ${isDrawerOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-canvas-main" />

        {/* Hex grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0L60 17.3v17.4L30 52 0 34.7V17.3z' fill='none' stroke='%23ff0000' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 52px' }} />

        {/* Red radial glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-800/[0.03] rounded-full blur-[120px]" />
        </div>

        {/* Bottom edge glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500/20 shadow-[0_5px_15px_var(--glow-primary)]" />

        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="w-full h-full bg-[linear-gradient(var(--glow-primary)_1px,transparent_1px)] bg-[length:100%_4px] animate-pulse" />
        </div>

        {/* Main Content — Centered branding */}
        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="min-h-full flex flex-col items-center justify-center px-6 py-4 gap-4">
            {/* ASCII Art Logo */}
            <pre className="text-primary-500 leading-[1.15] text-center font-mono select-none shrink-0" style={{ fontSize: 'clamp(7px, 1.6vmin, 14px)', textShadow: '0 0 20px var(--glow-primary)' }}>
              {`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⣶⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢰⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣶⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢻⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⣧⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣿⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣼⣿⣧⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣄⠈⠙⢿⣷⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣴⠾⠋⢸⠀⠄⠀⡏⠙⠳⣦⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⡿⠟⠉⢀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣦⣀⠈⠙⠛⠷⣦⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠠⠀⡇⠀⠀⠀⠀⠀⠀⠀⢀⣀⣠⣤⣤⡶⠟⠛⠁⢀⣤⣾⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠿⢶⣤⣤⣄⣀⣈⠉⠉⠛⠻⣷⣦⡄⠀⠀⢸⠀⠐⠀⡇⠀⠀⢀⣤⣶⠿⠛⠋⠉⢉⣀⣠⣤⣤⣶⠾⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠱⣦⣤⣀⣀⠈⠉⠙⠛⠛⠛⠳⢤⠈⢻⣿⠄⠀⢸⠀⢈⠀⡇⠀⠀⣾⣿⠃⣠⠖⠛⠛⠛⠋⠉⠉⢀⣀⣤⣤⠖⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠿⠻⠟⠿⠛⠶⢦⣄⠀⢁⣾⡟⠀⠀⢸⠀⠂⠀⡇⠀⠀⠹⣿⡆⠀⢠⡤⠶⠾⠛⠿⠻⠟⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠢⣤⣤⣤⡤⠤⠤⣤⡈⠀⣾⡏⠀⠀⠀⢸⠀⡐⠀⡇⠀⠀⠀⠘⣿⡆⢁⣠⠤⠤⠤⣤⣤⣤⠴⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢁⣀⣀⣀⣀⡀⠈⣿⠅⠀⠀⠀⢸⠀⢀⠀⡇⠀⠀⠀⠀⣿⡇⠀⣀⣀⣀⣀⡈⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠉⣉⡀⠹⡇⠀⠀⠀⢸⠀⠂⠀⡇⠀⠀⠀⢀⡿⢀⣈⡉⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠆⠙⠄⠀⠀⢸⠀⠐⠀⡇⠀⠀⠀⠈⠠⠞⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠌⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⡀⠄⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⣂⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣤⣄⠀⢀⡘⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⢻⡿⢠⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣶⣶⡄⢠⣶⣶⡄⠀⣶⣶⣶⡄⠀⢰⣶⣦⢰⣶⣶⠀⣶⣶⡦⠀⠀⠀⢠⣿⡿⠃⠀⣰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⡿⣿⡿⢻⣿⠀⠀⣼⣏⣿⣧⠀⠀⣿⡇⠀⣿⡇⠀⢸⣿⠀⠀⠀⢠⣿⡿⠁⠀⣼⣿⠏⣴⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣧⠙⢡⣼⣯⡄⣼⣿⡍⣽⣿⣤⠀⣿⣧⣤⣿⡇⠀⣼⣿⣤⣼⣷⣿⣿⡅⠀⣼⣿⡏⠀⠘⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠛⠁⠘⠛⠛⠃⠛⠛⠃⠛⠛⠛⠀⠉⠛⠛⠋⠁⠈⠛⠛⠛⠛⠋⠘⢿⣿⣿⡿⠟⠀⠀⠀⠹⣿⡷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`}
            </pre>

            {/* Tagline */}
            <p className="text-canvas-muted-deep font-mono text-[10px] uppercase tracking-[0.35em] animate-pulse">
              AI Digital Friend Zone
            </p>

            {/* Enter Button */}
            <div className="relative">
              <button
                onClick={() => { setIsDrawerOpen(false); }}
                className="relative group bg-black/40 overflow-hidden border border-primary-500/50 px-8 py-3 rounded-sm transition-all hover:border-primary-400 hover:shadow-[0_0_40px_var(--glow-primary)] active:scale-95"
              >
                <div className="absolute inset-0 bg-primary-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative text-primary-400 font-bold tracking-[0.2em] group-hover:text-white transition-colors text-sm uppercase">
                  ENTER GENCRAFT PRO
                </span>
              </button>
              {/* Decorative corner brackets */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary-900/40" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary-900/40" />
            </div>

            {/* Quick Nav Links */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: 'Dashboard', icon: Globe, href: 'https://sanbayfusion.com/dashboard/deployed-sites' },
                { label: 'AI Chat', icon: MessageSquare, href: 'https://demo.sanbayfusion.com' },
                { label: 'Agents', icon: Cpu, href: 'https://sanbayfusion.com/agents' },
                { label: 'Home', icon: Home, href: 'https://sanbayfusion.com/home' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-canvas-border bg-white/[0.02] text-canvas-muted hover:text-primary-400 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-sm font-mono uppercase tracking-wider"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </a>
              ))}
            </div>

            {/* Footer Status Bar */}
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-3 gap-10 text-xs text-gray-600 font-mono uppercase tracking-widest">
                <div className="text-center group">
                  <div className="text-primary-900 group-hover:text-primary-500 transition-colors mb-1">SECURE_LINK</div>
                  <div className="font-bold">[OK]</div>
                </div>
                <div className="text-center group">
                  <div className="text-primary-900 group-hover:text-primary-500 transition-colors mb-1">CORE_LOAD</div>
                  <div className="font-bold">[READY]</div>
                </div>
                <div className="text-center group">
                  <div className="text-primary-900 group-hover:text-primary-500 transition-colors mb-1">UPLINK_UP</div>
                  <div className="font-bold text-primary-400">[ACTIVE]</div>
                </div>
              </div>
            </div>

            {/* Bottom micro text */}
            <div className="mt-2 text-center">
              <span className="text-[8px] text-gray-800 font-mono uppercase tracking-[0.5em] opacity-30">
                Authorized Access Only // Terminal ID: 0xGC-PRO
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CORNER BUTTONS — Top-right, always visible (Canvas + Settings) */}
      {/* ============================================================ */}
      <div className="fixed top-1.5 right-1.5 z-[80] flex items-center gap-1.5">
        {/* Canvas Tools Button — Workspace tabs */}
        <button
          onClick={() => { const opening = !leftToolbarOpen; setLeftToolbarOpen(opening); if (!opening) setLeftPanelOpen(false); if (opening) { setCenterToolbarOpen(false); setActionsToolbarOpen(false); setRightToolbarOpen(false); } }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${leftToolbarOpen
            ? 'bg-gradient-to-br from-primary-600 to-primary-500 shadow-primary-500/25 scale-95'
            : 'bg-canvas-card/90 backdrop-blur-md border border-canvas-border hover:border-primary-500/30 hover:shadow-primary-500/15 hover:scale-105'
            }`}
          title="Workspace"
        >
          {leftToolbarOpen
            ? <img src="/logo.png" alt="Maula AI" className="w-8 h-8 object-contain brightness-0 invert" />
            : <Sparkles className="w-5 h-5 text-primary-400" />}
        </button>

        {/* Dev Tools Button — Infrastructure tabs */}
        <button
          onClick={() => { const opening = !centerToolbarOpen; setCenterToolbarOpen(opening); if (!opening) setLeftPanelOpen(false); if (opening) { setLeftToolbarOpen(false); setActionsToolbarOpen(false); setRightToolbarOpen(false); } }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${centerToolbarOpen
            ? 'bg-gradient-to-br from-primary-600 to-primary-500 shadow-primary-500/25 scale-95'
            : 'bg-canvas-card/90 backdrop-blur-md border border-canvas-border hover:border-primary-500/30 hover:shadow-primary-500/15 hover:scale-105'
            }`}
          title="Dev Tools"
        >
          {centerToolbarOpen
            ? <img src="/logo.png" alt="Maula AI" className="w-8 h-8 object-contain brightness-0 invert" />
            : <Boxes className="w-5 h-5 text-primary-400" />}
        </button>

        {/* Actions Button — Deploy, Analytics, AI Tools, etc */}
        <button
          onClick={() => { const opening = !actionsToolbarOpen; setActionsToolbarOpen(opening); if (opening) { setLeftToolbarOpen(false); setCenterToolbarOpen(false); setRightToolbarOpen(false); } }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${actionsToolbarOpen
            ? 'bg-gradient-to-br from-primary-600 to-primary-500 shadow-primary-500/25 scale-95'
            : 'bg-canvas-card/90 backdrop-blur-md border border-canvas-border hover:border-primary-500/30 hover:shadow-primary-500/15 hover:scale-105'
            }`}
          title="Actions"
        >
          {actionsToolbarOpen
            ? <img src="/logo.png" alt="Maula AI" className="w-8 h-8 object-contain brightness-0 invert" />
            : <LayoutGrid className="w-5 h-5 text-primary-400" />}
        </button>

        {/* Settings Button — Editor settings */}
        <button
          onClick={() => { const opening = !rightToolbarOpen; setRightToolbarOpen(opening); if (opening) { setLeftToolbarOpen(false); setCenterToolbarOpen(false); setActionsToolbarOpen(false); setLeftPanelOpen(false); } }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${rightToolbarOpen
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/25 scale-95'
            : 'bg-canvas-card/90 backdrop-blur-md border border-canvas-border hover:border-primary-500/30 hover:shadow-primary-500/15 hover:scale-105'
            }`}
          title="Editor Settings"
        >
          {rightToolbarOpen
            ? <img src="/logo.png" alt="Maula AI" className="w-8 h-8 object-contain brightness-0 invert" />
            : <Settings className="w-5 h-5 text-primary-400" />}
        </button>
      </div>

      {/* ============================================================ */}
      {/* LEFT HEADER BAR — Workspace tabs */}
      {/* ============================================================ */}
      <div className={`fixed top-0 left-2 right-[13.5rem] h-11 z-[70] transition-all duration-400 ease-in-out ${leftToolbarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
        }`}>
        <div className="h-full bg-canvas-main/95 backdrop-blur-xl border-b border-canvas-border flex items-center gap-1 px-2 rounded-xl shadow-2xl shadow-black/30 whitespace-nowrap overflow-x-auto scrollbar-hide">
          {/* Brand */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-canvas-border mr-1">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-primary-500 rounded-md flex items-center justify-center overflow-hidden p-0.5">
              <img src="/logo.png" alt="Maula AI" className="w-full h-full object-contain brightness-0 invert" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[10px] font-bold text-white leading-none">GenCraft</h1>
              <p className="text-[7px] text-canvas-muted-deep">Pro</p>
            </div>
          </div>

          {/* Workspace Tab Buttons */}
          {([
            { id: 'chat' as SidebarTab, label: 'Chat', icon: MessageSquare, tooltip: 'AI Chat — converse with AI to build your app' },
            { id: 'files' as SidebarTab, label: 'Files', icon: FolderTree, tooltip: 'File Explorer — browse and edit project files' },
            { id: 'quickstart' as SidebarTab, label: 'Quick Start', icon: Zap, tooltip: 'Quick Start — describe your app or pick a template' },
            { id: 'browse' as SidebarTab, label: 'Templates', icon: LayoutTemplate, tooltip: 'Templates — browse all templates by category' },
            { id: 'history' as SidebarTab, label: 'History', icon: Clock, tooltip: 'History — view and manage saved projects' },
            { id: 'drafts' as SidebarTab, label: 'Drafts', icon: Archive, tooltip: 'Drafts — projects saved when starting a new chat' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (sidebarTab === tab.id && leftPanelOpen) {
                  setLeftPanelOpen(false);
                } else {
                  requireAuth(() => { setSidebarTab(tab.id); setLeftPanelOpen(true); });
                }
              }}
              title={tab.tooltip}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${sidebarTab === tab.id && leftPanelOpen
                ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/25'
                : 'text-canvas-muted hover:text-white hover:bg-white/[0.06]'
                }${tab.id === 'drafts' && drafts.length > 0 ? ' relative' : ''}`}
            >
              <tab.icon className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'drafts' && drafts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{drafts.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CENTER HEADER BAR — Dev Tools tabs */}
      {/* ============================================================ */}
      <div className={`fixed top-0 left-2 right-[13.5rem] h-11 z-[70] transition-all duration-400 ease-in-out ${centerToolbarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
        }`}>
        <div className="h-full bg-canvas-main/95 backdrop-blur-xl border-b border-canvas-border flex items-center gap-1 px-2 rounded-xl shadow-2xl shadow-black/30 whitespace-nowrap overflow-x-auto scrollbar-hide">
          {/* Workspace shortcut */}
          <button onClick={() => { setCenterToolbarOpen(false); setLeftToolbarOpen(true); }} className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] transition-all" title="Workspace"><Sparkles className="w-3.5 h-3.5" /></button>
          {/* Dev Tools label */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-canvas-border mr-1">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-primary-500 rounded-md flex items-center justify-center">
              <Boxes className="w-3 h-3 text-white" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[10px] font-bold text-white leading-none">Dev</h1>
              <p className="text-[7px] text-canvas-muted-deep">Tools</p>
            </div>
          </div>

          {/* Dev/Infra Tab Buttons */}
          {([
            { id: 'build' as SidebarTab, label: 'Build', icon: Hammer, tooltip: 'Build — configure and run project builds' },
            { id: 'assets' as SidebarTab, label: 'Assets', icon: FolderOpen, tooltip: 'Assets — manage images, fonts, and media' },
            { id: 'git' as SidebarTab, label: 'Git', icon: GitBranch, tooltip: 'Git — version control and branch management' },
            { id: 'deps' as SidebarTab, label: 'Deps', icon: Package, tooltip: 'Dependencies — install and manage packages' },
            { id: 'env' as SidebarTab, label: 'Env', icon: KeyRound, tooltip: 'Environment — manage env variables and secrets' },
            { id: 'database' as SidebarTab, label: 'DB', icon: Database, tooltip: 'Database — schema design and queries' },
            { id: 'video' as SidebarTab, label: 'Video', icon: Film, tooltip: 'Video — AI video generator and editor' },
            { id: 'monitoring' as SidebarTab, label: 'Monitor', icon: Activity, tooltip: 'Monitoring — logs, metrics, health status' },
            { id: 'api' as SidebarTab, label: 'API', icon: Globe, tooltip: 'API Tester — HTTP requests, mocking, webhooks, SDK generation' },
            { id: 'security' as SidebarTab, label: 'Security', icon: Shield, tooltip: 'Security — secrets scanner, crypto, threat modeling, incident response' },
            { id: 'cloud' as SidebarTab, label: 'Cloud', icon: Cloud, tooltip: 'Cloud — deploy, autoscale, logs, secrets, cost analysis' },
            { id: 'workflow' as SidebarTab, label: 'Workflow', icon: Zap, tooltip: 'Workflow — visual builder, execution, scheduling, and optimization' },
            { id: 'docs' as SidebarTab, label: 'Docs', icon: FileText, tooltip: 'Documents — PDF/DOCX/CSV parser, archive manager, Markdown tools, transcription' },
            { id: 'data' as SidebarTab, label: 'Data', icon: BarChart3, tooltip: 'Data Science — profiling, cleaning, visualization, analytics, and ML model comparison' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (sidebarTab === tab.id && leftPanelOpen) {
                  setLeftPanelOpen(false);
                } else {
                  requireAuth(() => { setSidebarTab(tab.id); setLeftPanelOpen(true); });
                }
              }}
              title={tab.tooltip}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${sidebarTab === tab.id && leftPanelOpen
                ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/25'
                : 'text-canvas-muted hover:text-white hover:bg-white/[0.06]'
                }`}
            >
              <tab.icon className="w-3 h-3 shrink-0" />
              <span className="hidden xl:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT HEADER BAR — App Settings */}
      {/* ============================================================ */}
      <div className={`fixed top-0 left-2 right-[13.5rem] h-11 z-[70] transition-all duration-400 ease-in-out ${rightToolbarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
        }`}>
        <div className="h-full bg-canvas-main/95 backdrop-blur-xl border-b border-canvas-border flex items-center gap-1 px-2 rounded-xl shadow-2xl shadow-black/30 whitespace-nowrap overflow-x-auto scrollbar-hide">
          {/* Workspace shortcut */}
          <button onClick={() => { setRightToolbarOpen(false); setLeftToolbarOpen(true); }} className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] transition-all mr-1" title="Workspace"><Sparkles className="w-3.5 h-3.5" /></button>

          {/* Settings Label */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-canvas-border mr-1">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-primary-500 rounded-md flex items-center justify-center">
              <Settings className="w-3 h-3 text-white" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[10px] font-bold text-white leading-none">Settings</h1>
              <p className="text-[7px] text-canvas-muted-deep">App</p>
            </div>
          </div>

          {/* Language Badge (auto-detected) */}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-canvas-muted" title="Language (auto-detected from your app)">
            <span className="text-xs">{LANGUAGES.find(l => l.id === currentLanguage)?.icon}</span>
            <span className="hidden sm:inline">{LANGUAGES.find(l => l.id === currentLanguage)?.name || 'HTML'}</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Editor Settings Button */}
          <button
            onClick={() => { if (sidebarTab === 'editor-settings' && leftPanelOpen) { setLeftPanelOpen(false); } else { setSidebarTab('editor-settings'); setLeftPanelOpen(true); } }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${sidebarTab === 'editor-settings' && leftPanelOpen ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/25' : 'text-canvas-muted hover:text-white hover:bg-white/[0.06]'}`}
            title="Editor Settings — font, theme, formatting"
          >
            <Type className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Editor</span>
          </button>

          {/* Auto-save Toggle */}
          <button
            onClick={() => updateEditorSettings({ autoSave: !editorSettings.autoSave })}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${editorSettings.autoSave ? 'bg-emerald-500/15 text-emerald-300' : 'text-canvas-muted hover:text-white hover:bg-white/[0.06]'}`}
            title={`Auto-save: ${editorSettings.autoSave ? 'ON' : 'OFF'}`}
          >
            {editorSettings.autoSave ? <ToggleRight className="w-3.5 h-3.5 shrink-0" /> : <ToggleLeft className="w-3.5 h-3.5 shrink-0" />}
            <span className="hidden sm:inline">Auto-save</span>
          </button>

          {/* Format on Save Toggle */}
          <button
            onClick={() => updateEditorSettings({ formatOnSave: !editorSettings.formatOnSave })}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${editorSettings.formatOnSave ? 'bg-emerald-500/15 text-emerald-300' : 'text-canvas-muted hover:text-white hover:bg-white/[0.06]'}`}
            title={`Format on Save: ${editorSettings.formatOnSave ? 'ON' : 'OFF'}`}
          >
            <Palette className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Format</span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Search & Replace */}
          <button onClick={() => toggleSearch()} className="p-1.5 rounded-md text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all" title="Search & Replace">
            <Search className="w-3 h-3" />
          </button>

          {/* Export / Download App */}
          <button
            onClick={() => {
              if (currentApp?.code) {
                const blob = new Blob([currentApp.code], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentApp.name || 'app'}.html`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            className="p-1.5 rounded-md text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all"
            title="Export / Download App"
          >
            <Download className="w-3 h-3" />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Voice Input */}
          <button
            onClick={() => { if (sidebarTab === 'voice' && leftPanelOpen) { setLeftPanelOpen(false); } else { requireAuth(() => { setSidebarTab('voice'); setLeftPanelOpen(true); }); } }}
            className={`p-1.5 rounded-md transition-all ${sidebarTab === 'voice' && leftPanelOpen ? 'bg-cyan-500/20 text-cyan-300' : 'text-canvas-muted hover:text-cyan-300 hover:bg-cyan-500/10'}`}
            title="Voice Input"
          >
            <Mic className="w-3 h-3" />
          </button>

          {/* Image to Code */}
          <button
            onClick={() => { if (sidebarTab === 'image-to-code' && leftPanelOpen) { setLeftPanelOpen(false); } else { requireAuth(() => { setSidebarTab('image-to-code'); setLeftPanelOpen(true); }); } }}
            className={`p-1.5 rounded-md transition-all ${sidebarTab === 'image-to-code' && leftPanelOpen ? 'bg-cyan-500/20 text-cyan-300' : 'text-canvas-muted hover:text-cyan-300 hover:bg-cyan-500/10'}`}
            title="Image to Code"
          >
            <Image className="w-3 h-3" />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06]" />

          {/* AI Model Badge */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium text-canvas-muted bg-white/[0.03] border border-canvas-border">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-canvas-text">Maula AI</span>
            <span className="text-gray-600">•</span>
            <span className="text-canvas-muted-deep">Powered by Claude</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ACTIONS HEADER BAR — Deploy, Analytics, Tools, Menu */}
      {/* ============================================================ */}
      <div className={`fixed top-0 left-2 right-[13.5rem] h-11 z-[70] transition-all duration-400 ease-in-out ${actionsToolbarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
        }`}>
        <div className="h-full bg-canvas-main/95 backdrop-blur-xl border-b border-canvas-border flex items-center gap-1 px-2 rounded-xl shadow-2xl shadow-black/30 whitespace-nowrap overflow-x-auto scrollbar-hide">
          {/* Workspace shortcut */}
          <button onClick={() => { setActionsToolbarOpen(false); setLeftToolbarOpen(true); }} className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] transition-all" title="Workspace"><Sparkles className="w-3.5 h-3.5" /></button>
          {/* Actions label */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-canvas-border mr-1">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-primary-500 rounded-md flex items-center justify-center">
              <LayoutGrid className="w-3 h-3 text-white" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[10px] font-bold text-white leading-none">Actions</h1>
              <p className="text-[7px] text-canvas-muted-deep">Pro</p>
            </div>
          </div>

          {/* Deploy Button */}
          <button onClick={() => setShowDeployPanel(true)} className="px-3 py-1.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-[10px] font-bold rounded-lg hover:from-primary-700 hover:to-primary-600 transition-all shadow-lg shadow-primary-500/15 active:scale-95 flex items-center gap-1.5">
            <Rocket className="w-3 h-3" />
            DEPLOY
          </button>

          {/* Analytics Button */}
          <button onClick={() => setShowAnalytics(true)} className="px-2.5 py-1.5 rounded-lg text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all flex items-center gap-1.5" title="Analytics">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium hidden sm:inline">ANALYTICS</span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Tool Overlays */}
          <button onClick={() => requireAuth(() => { setSidebarTab('ai-tools'); setLeftPanelOpen(true); })} className="p-1.5 rounded-md text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all" title="AI Tools">
            <Wrench className="w-3 h-3" />
          </button>
          <button onClick={() => requireAuth(() => { setSidebarTab('billing'); setLeftPanelOpen(true); })} className="p-1.5 rounded-md text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all" title="Billing">
            <CreditCard className="w-3 h-3" />
          </button>
          <button onClick={() => requireAuth(() => { setSidebarTab('monitoring'); setLeftPanelOpen(true); })} className="p-1.5 rounded-md text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all" title="Monitoring">
            <Activity className="w-3 h-3" />
          </button>
          <button onClick={() => requireAuth(() => { setSidebarTab('video'); setLeftPanelOpen(true); })} className="p-1.5 rounded-md text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all" title="Video Editor">
            <Film className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSearch()} className="p-1.5 rounded-md text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all" title="Search & Replace">
            <Search className="w-3 h-3" />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Menu Button — opens branded drawer */}
          <button onClick={() => setIsDrawerOpen(true)} className="px-2.5 py-1.5 rounded-lg text-canvas-muted hover:text-primary-300 hover:bg-primary-500/10 transition-all flex items-center gap-1.5" title="Open Menu">
            <Menu className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium hidden sm:inline">MENU</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN BODY — Full screen with optional side panels */}
      {/* ============================================================ */}
      <div className="flex-1 flex min-h-0 overflow-hidden pt-14">

        {/* LEFT PANEL — Opens when a tab is selected from left header bar */}
        {/* Dev tool tabs expand to full width; workspace tabs stay at 320px */}
        <aside className={`shrink-0 flex flex-col bg-canvas-card/95 backdrop-blur-xl border-r border-canvas-border transition-all duration-300 ease-in-out overflow-hidden ${leftPanelOpen
          ? (isDevToolTab(sidebarTab) ? 'flex-1' : 'w-[320px]')
          : 'w-0 border-r-0'
          }`}>
          <div className={`${isDevToolTab(sidebarTab) ? 'w-full min-w-0' : 'w-[320px] min-w-[320px]'} h-full flex flex-col overflow-x-hidden`}>
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-canvas-border shrink-0">
              <div className="flex items-center gap-2">
                {sidebarTab === 'chat' && <MessageSquare className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'files' && <FolderTree className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'quickstart' && <Zap className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'browse' && <LayoutTemplate className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'history' && <Clock className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'drafts' && <Archive className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'build' && <Hammer className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'assets' && <FolderOpen className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'git' && <GitBranch className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'deps' && <Package className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'env' && <KeyRound className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'database' && <Database className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'video' && <Film className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'monitoring' && <Activity className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'billing' && <CreditCard className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'ai-tools' && <Wrench className="w-3.5 h-3.5 text-primary-400" />}
                {sidebarTab === 'image-to-code' && <Image className="w-3.5 h-3.5 text-cyan-400" />}
                {sidebarTab === 'voice' && <Mic className="w-3.5 h-3.5 text-cyan-400" />}
                {sidebarTab === 'editor-settings' && <Settings className="w-3.5 h-3.5 text-primary-400" />}
                <span className="text-xs font-semibold text-gray-200 capitalize">{sidebarTab === 'ai-tools' ? 'AI Tools' : sidebarTab === 'image-to-code' ? 'Image to Code' : sidebarTab === 'voice' ? 'Voice Input' : sidebarTab === 'editor-settings' ? 'Editor Settings' : sidebarTab}</span>
              </div>
              <div className="flex items-center gap-1">
                {sidebarTab === 'chat' && (
                  <button
                    onClick={handleNewChat}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all"
                    title="Start new chat (saves current project to drafts)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                )}
                {(sidebarTab === 'voice' || sidebarTab === 'image-to-code') && (
                  <button
                    onClick={() => { setSidebarTab('chat'); setLeftToolbarOpen(true); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary-400 hover:bg-primary-500/10 hover:text-primary-300 transition-all"
                    title="Switch to Chat"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Chat</span>
                  </button>
                )}
                <button onClick={() => setLeftPanelOpen(false)} className="p-1 rounded-md text-canvas-muted-deep hover:text-canvas-text hover:bg-white/[0.04] transition-all" title="Close panel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
              {sidebarTab === 'chat' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <ChatBox messages={currentApp?.history || []} onSendMessage={(text, attachments, mode) => handleChatMessage(text, attachments, mode)} isGenerating={genState.isGenerating} onStopGeneration={() => { setGenState({ isGenerating: false, error: null, progressMessage: '' }); setStreamingMessage(null); }} onFileClick={(path) => { setActiveFilePath(path); setViewMode('code'); }} streamingMessage={streamingMessage} progressMessage={genState.progressMessage} />
                </div>
              )}
              {sidebarTab === 'files' && (
                <div className="flex-1 overflow-hidden">
                  <FileTree
                    files={projectFiles}
                    activeFile={activeFilePath}
                    onFileSelect={(path) => { setActiveFilePath(path); setViewMode('code'); }}
                    darkMode={true}
                  />
                </div>
              )}
              {sidebarTab === 'quickstart' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex h-full">
                    {/* Left: Describe App */}
                    <div className="w-[400px] min-w-[320px] shrink-0 border-r border-canvas-border flex flex-col">
                      <div className="p-5 pb-4">
                        <h3 className="text-sm font-bold text-white mb-1">Describe Your App</h3>
                        <p className="text-[10px] text-white/30 mb-4">Tell Nova what you want to build and it will generate the code</p>
                        <div className="relative">
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) { e.preventDefault(); requireAuth(() => { setSidebarTab('chat'); setLeftPanelOpen(true); handleChatMessage(prompt); setPrompt(''); }); } }}
                            placeholder="Describe what you want to build..."
                            rows={5}
                            className="w-full px-3 py-2.5 text-xs bg-white/[0.04] border border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/30 outline-none text-gray-200 placeholder-gray-600 resize-none leading-relaxed"
                          />
                          <button
                            onClick={() => { if (prompt.trim()) { requireAuth(() => { setSidebarTab('chat'); setLeftPanelOpen(true); handleChatMessage(prompt); setPrompt(''); }); } }}
                            disabled={genState.isGenerating || !prompt.trim()}
                            className="absolute right-2 bottom-2 px-4 py-2 text-[11px] font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg hover:from-primary-700 hover:to-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Play className="w-3 h-3" />
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Start Templates Grid */}
                    <div className="flex-1 overflow-y-auto p-5">
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Quick Start Templates</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {PRESET_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.name}
                            onClick={() => { setPrompt(tpl.prompt); }}
                            className={`w-full text-left px-4 py-4 rounded-xl border transition-all group ${prompt === tpl.prompt ? 'bg-primary-500/15 text-primary-300 border-primary-500/30' : 'text-canvas-muted bg-white/[0.02] hover:bg-primary-500/10 hover:text-primary-300 border-canvas-border hover:border-primary-500/20'}`}
                          >
                            <div className="font-semibold text-sm mb-1">{tpl.name}</div>
                            <p className="text-[10px] text-white/25 leading-relaxed line-clamp-2">{tpl.prompt}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {sidebarTab === 'browse' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                  <TemplatesInlinePanel
                    onUsePrebuilt={(app) => {
                      // Create a GeneratedApp from the prebuilt code and load it directly into preview
                      const newApp: GeneratedApp = {
                        id: `prebuilt-${app.id}-${Date.now()}`,
                        name: app.name,
                        code: app.code,
                        prompt: `Prebuilt template: ${app.name}`,
                        timestamp: Date.now(),
                        history: [
                          {
                            role: 'assistant',
                            text: `✅ Loaded prebuilt app: **${app.name}**\n\n${app.description}\n\nThe preview is now showing this app. You can ask me to modify or customize it!`,
                            timestamp: Date.now(),
                          },
                        ],
                        language: app.language,
                      };
                      setCurrentApp(newApp);
                      setCurrentLanguage(app.language);
                      setSidebarTab('chat');
                      setLeftPanelOpen(true);
                    }}
                    onUseAITemplate={(template) => {
                      setCurrentLanguage(template.language);
                      setSidebarTab('chat');
                      setLeftPanelOpen(true);
                      // Auto-generate from the template prompt
                      setTimeout(() => {
                        handleChatMessage(template.prompt);
                      }, 100);
                    }}
                  />
                </div>
              )}
              {sidebarTab === 'history' && (
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/30" />
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Project History</span>
                      {history.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30">{history.length}</span>}
                    </div>
                  </div>
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : history.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {history.map((app) => (
                        <div key={app.id} className={`group relative rounded-xl transition-all border overflow-hidden ${currentApp?.id === app.id ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/[0.02] border-canvas-border hover:border-primary-500/20 hover:bg-primary-500/5'}`}>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-sm mb-1 truncate ${currentApp?.id === app.id ? 'text-primary-300' : 'text-canvas-text'}`}>{app.name}</div>
                                <div className="text-[10px] text-white/30">{new Date(app.timestamp).toLocaleString()}</div>
                              </div>
                              <div className="relative shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setHistoryMenuId(historyMenuId === app.id ? null : app.id); }}
                                  className="p-1.5 rounded-md text-canvas-muted-deep hover:text-white hover:bg-white/[0.08] transition-all"
                                  title="More options"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                {historyMenuId === app.id && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-canvas-card border border-white/[0.1] rounded-lg shadow-2xl shadow-black/50 z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <button onClick={(e) => { e.stopPropagation(); handleShareProject(app); setHistoryMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-canvas-muted hover:text-white hover:bg-white/[0.06] transition-all">
                                      <Share2 className="w-3 h-3" /> Share
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadProject(app); setHistoryMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-canvas-muted hover:text-white hover:bg-white/[0.06] transition-all">
                                      <Download className="w-3 h-3" /> Download
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentApp(app); setSidebarTab('chat'); setHistoryMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-canvas-muted hover:text-white hover:bg-white/[0.06] transition-all">
                                      <Pencil className="w-3 h-3" /> Load & Edit
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(app.code || ''); setHistoryMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-canvas-muted hover:text-white hover:bg-white/[0.06] transition-all">
                                      <Copy className="w-3 h-3" /> Copy Code
                                    </button>
                                    <div className="my-1 border-t border-canvas-border" />
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteHistoryEntry(app.id); setHistoryMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-all">
                                      <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {app.prompt && <p className="text-[10px] text-white/20 line-clamp-2 mb-3">{app.prompt}</p>}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setCurrentApp(app); setSidebarTab('chat'); setLeftPanelOpen(true); }}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/25 rounded-lg text-[10px] font-semibold text-primary-300 transition-all"
                              >
                                <Play size={10} />Load
                              </button>
                              <button
                                onClick={() => handleDownloadProject(app)}
                                className="flex items-center justify-center gap-1 py-1.5 px-3 bg-white/[0.04] hover:bg-white/[0.07] border border-canvas-border rounded-lg text-[10px] font-medium text-white/40 hover:text-white/70 transition-all"
                              >
                                <Download size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-white/20">
                      <Clock className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg font-semibold mb-1">No history yet</p>
                      <p className="text-sm text-white/15">Your generated apps will appear here</p>
                    </div>
                  )}
                </div>
              )}
              {sidebarTab === 'drafts' && (
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-white/30" />
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Drafts</span>
                      {drafts.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30">{drafts.length}</span>}
                    </div>
                  </div>
                  {drafts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {drafts.map((draft) => (
                        <div key={draft.id} className="group relative rounded-xl transition-all border overflow-hidden bg-white/[0.02] border-canvas-border hover:border-amber-500/20 hover:bg-amber-500/5">
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleRestoreDraft(draft)}>
                                <div className="font-semibold text-sm mb-1 truncate text-amber-300/80">{draft.name}</div>
                                <div className="text-[10px] text-white/30">{new Date(draft.timestamp).toLocaleString()}</div>
                              </div>
                              <button
                                onClick={() => handleDeleteDraft(draft.id)}
                                className="p-1.5 rounded-md text-canvas-muted-deep hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                                title="Delete draft"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {draft.prompt && <p className="text-[10px] text-white/20 line-clamp-2 mb-3">{draft.prompt}</p>}
                            <button
                              onClick={() => handleRestoreDraft(draft)}
                              className="w-full flex items-center justify-center gap-1 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 rounded-lg text-[10px] font-semibold text-amber-300 transition-all"
                            >
                              <Play size={10} />Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-white/20">
                      <Archive className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg font-semibold mb-1">No drafts yet</p>
                      <p className="text-sm text-white/15">Click "+" in Chat to save your current project as a draft</p>
                    </div>
                  )}
                </div>
              )}
              {sidebarTab === 'build' && (
                <div className="flex-1 overflow-hidden">
                  <BuildPanel projectId={currentApp?.id || 'default'} />
                </div>
              )}
              {sidebarTab === 'assets' && (
                <div className="flex-1 overflow-hidden">
                  <AssetBrowser
                    projectId={currentApp?.id || 'default'}
                    onInsertUrl={(url) => {
                      if (activeFilePath) {
                        const current = editorBridge.getFile(activeFilePath) || '';
                        editorBridge.updateFile(activeFilePath, current + `\n/* Asset: ${url} */\n`);
                      }
                    }}
                  />
                </div>
              )}
              {sidebarTab === 'git' && (
                <div className="flex-1 overflow-hidden">
                  <GitPanel />
                </div>
              )}
              {sidebarTab === 'deps' && (
                <div className="flex-1 overflow-hidden">
                  <DependenciesPanel
                    projectId={currentApp?.id || 'default'}
                  />
                </div>
              )}
              {sidebarTab === 'env' && (
                <div className="flex-1 overflow-hidden">
                  <EnvironmentVars
                    projectId={currentApp?.id || 'default'}
                  />
                </div>
              )}
              {sidebarTab === 'database' && (
                <div className="flex-1 overflow-hidden">
                  <DatabasePanel projectId={currentApp?.id || 'default'} />
                </div>
              )}
              {sidebarTab === 'video' && (
                <div className="flex-1 overflow-hidden">
                  <VideoEditorPanel
                    userId={authUser?.id || ''}
                    onPreviewVideo={(url, title) => setVideoPreview({ url, title })}
                  />
                </div>
              )}
              {sidebarTab === 'monitoring' && (
                <div className="flex-1 overflow-hidden">
                  <MonitoringDashboard projectId={currentApp?.id || 'default'} />
                </div>
              )}
              {sidebarTab === 'billing' && (
                <div className="flex-1 overflow-hidden">
                  <BillingPanel authUser={authUser} />
                </div>
              )}
              {sidebarTab === 'ai-tools' && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <AIToolsPanel
                    activeFilePath={activeFilePath}
                    getFileContent={(path) => useEditorStore.getState().files[path] || ''}
                    onApplyFix={(path, content) => {
                      editorBridge.updateFile(path, content);
                      const newCode = editorBridge.toCode();
                      if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); }
                    }}
                  />
                </div>
              )}
              {sidebarTab === 'image-to-code' && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <ImageToCodePanel
                    defaultLanguage={['react', 'nextjs'].includes(currentLanguage) ? 'react' : 'html'}
                    onUseCode={(code, lang) => {
                      const langLabels: Record<string, string> = {
                        html: 'HTML / CSS / JS',
                        react: 'React + Tailwind',
                        vue: 'Vue.js',
                        angular: 'Angular',
                        svelte: 'Svelte',
                        nextjs: 'Next.js',
                      };
                      const newApp: GeneratedApp = {
                        id: Date.now().toString(),
                        name: 'From Image',
                        code,
                        prompt: `Generated from image upload (${langLabels[lang] || lang})`,
                        timestamp: Date.now(),
                        history: [{ role: 'model', text: `Generated ${langLabels[lang] || lang} code from uploaded image`, timestamp: Date.now() }],
                        language: ['react', 'nextjs'].includes(lang) ? 'react' : 'html',
                        provider: selectedModel.provider,
                        modelId: selectedModel.id,
                      };
                      setCurrentApp(newApp);
                      saveApp(newApp, true);
                      setSidebarTab('chat');
                      setLeftPanelOpen(true);
                    }}
                  />
                </div>
              )}
              {sidebarTab === 'api' && (
                <div className="flex-1 overflow-hidden">
                  <ApiTesterPanel projectId={currentApp?.id || 'default'} previewUrl={previewUrl} />
                </div>
              )}
              {sidebarTab === 'security' && (
                <div className="flex-1 overflow-hidden">
                  <SecurityPanel projectId={currentApp?.id || 'default'} />
                </div>
              )}
              {sidebarTab === 'cloud' && (
                <div className="flex-1 overflow-hidden">
                  <CloudPanel projectId={currentApp?.id || 'default'} previewUrl={previewUrl} />
                </div>
              )}
              {sidebarTab === 'workflow' && (
                <div className="flex-1 overflow-hidden">
                  <WorkflowPanel projectId={currentApp?.id || 'default'} />
                </div>
              )}
              {sidebarTab === 'docs' && (
                <div className="flex-1 overflow-hidden">
                  <DocumentsPanel projectId={currentApp?.id || 'default'} />
                </div>
              )}
              {sidebarTab === 'data' && (
                <div className="flex-1 overflow-hidden">
                  <DataSciencePanel projectId={currentApp?.id || 'default'} />
                </div>
              )}
              {sidebarTab === 'voice' && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <VoicePanel
                    onSendToChat={(text) => {
                      setPrompt(text);
                      setSidebarTab('chat');
                      setTimeout(() => { handleChatMessage(text); setPrompt(''); }, 50);
                    }}
                    onGenerateCode={(text) => {
                      setSidebarTab('chat');
                      setTimeout(() => { handleChatMessage(`Generate code for: ${text}`); }, 50);
                    }}
                  />
                </div>
              )}
              {sidebarTab === 'editor-settings' && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <EditorSettings />
                </div>
              )}
            </div>


          </div>
        </aside>

        {/* ============================================================ */}
        {/* CENTER — Full-screen Preview / Code Area */}
        {/* ============================================================ */}
        <main className={`flex-1 relative overflow-hidden bg-canvas-main min-w-0 ${leftPanelOpen && isDevToolTab(sidebarTab) ? 'hidden' : ''}`} onClick={() => { if (leftToolbarOpen) setLeftToolbarOpen(false); if (centerToolbarOpen) setCenterToolbarOpen(false); if (actionsToolbarOpen) setActionsToolbarOpen(false); if (rightToolbarOpen) setRightToolbarOpen(false); }}>
          {genState.isGenerating && (
            <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
              <div className="h-0.5 bg-primary-900/30 overflow-hidden">
                <div className="h-full bg-primary-500" style={{ width: '100%', animation: 'indeterminate 1.5s ease-in-out infinite', transformOrigin: 'left' }} />
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-canvas-card/90 backdrop-blur-sm border-b border-canvas-border">
                <div className="w-3 h-3 border-2 border-primary-900/40 border-t-primary-500 rounded-full animate-spin shrink-0" />
                <span className="text-[11px] text-canvas-text font-medium">{genState.progressMessage}</span>
              </div>
            </div>
          )}
          {videoPreview && (
            <div className="absolute inset-0 z-30 bg-black flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-canvas-card border-b border-canvas-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Film className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-sm text-white font-medium truncate">{videoPreview.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <a
                    href={videoPreview.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-canvas-muted hover:text-white hover:bg-white/10 transition-all"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setVideoPreview(null)}
                    className="p-1.5 rounded-md text-canvas-muted hover:text-white hover:bg-white/10 transition-all"
                    title="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center bg-black p-6">
                <video
                  src={videoPreview.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                />
              </div>
            </div>
          )}
          <div className="h-full flex flex-col">
            {/* Inline Search/Replace Bar */}
            <SearchReplace
              onSearch={(query, flags) => {
                const files = useEditorStore.getState().files;
                const results: { path: string; line: number; column: number; text: string }[] = [];
                Object.entries(files).forEach(([filePath, content]) => {
                  const lines = content.split('\n');
                  lines.forEach((lineText, i) => {
                    let searchStr = query;
                    let haystack = lineText;
                    if (!flags.isCaseSensitive) { searchStr = searchStr.toLowerCase(); haystack = haystack.toLowerCase(); }
                    const idx = haystack.indexOf(searchStr);
                    if (idx !== -1) results.push({ path: filePath, line: i + 1, column: idx, text: lineText.trim() });
                  });
                });
                useEditorSettingsStore.getState().setSearchResults(results, results.length);
              }}
              onReplace={(search, replace) => {
                if (activeFilePath) {
                  const content = useEditorStore.getState().files[activeFilePath] || '';
                  const updated = content.replace(search, replace);
                  editorBridge.updateFile(activeFilePath, updated);
                  const newCode = editorBridge.toCode();
                  if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); }
                }
              }}
              onReplaceAll={(search, replace) => {
                const files = useEditorStore.getState().files;
                let changed = false;
                Object.entries(files).forEach(([path, content]) => {
                  const updated = content.split(search).join(replace);
                  if (updated !== content) { editorBridge.updateFile(path, updated); changed = true; }
                });
                if (changed) {
                  const newCode = editorBridge.toCode();
                  if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); }
                }
              }}
              onNavigateResult={(file, line) => {
                setActiveFilePath(file);
                setEditorMode('edit');
                setViewMode('code');
              }}
            />
            {leftPanelOpen && isDevToolTab(sidebarTab) ? null
              : editorMode === 'edit' && (viewMode === 'code' || viewMode === 'split') ? (
                <div className="flex-1 flex min-h-0">
                  {viewMode === 'split' && (
                    <div className="w-1/2 border-r border-canvas-border flex flex-col">
                      <PreviewToolbar device={deviceMode} onDeviceChange={setDeviceMode} url={previewUrl || sandboxUrl || 'canvas.sanbayfusion.com'} onRefresh={handleRefreshPreview} showConsole={showConsolePanel} onToggleConsole={() => setShowConsolePanel(p => !p)} showNetwork={showNetworkPanel} onToggleNetwork={() => setShowNetworkPanel(p => !p)} zoom={previewZoom} onZoomChange={setPreviewZoom} canUndo={canUndo} onUndo={handleUndo} canRedo={canRedo} onRedo={handleRedo} versionIndex={historyIndex} versionTotal={codeHistory.length} onOpenExternal={previewUrl ? () => window.open(previewUrl, '_blank', 'noopener') : undefined} viewMode={viewMode} onViewModeChange={setViewMode} onEditorModeEdit={() => setEditorMode('edit')} />
                      <div className="flex-1 min-h-0">
                        <SandpackPreview code={currentApp?.code || ''} language={(() => { const c = (currentApp?.code || '').trimStart(); const isHtml = c.startsWith('<!DOCTYPE') || c.startsWith('<html') || (c.startsWith('<') && (c.includes('</html>') || c.includes('</body>'))); return isHtml ? 'html' : ['react', 'nextjs'].includes(currentLanguage) ? 'react' : 'html'; })()} currentLanguage={currentLanguage} viewMode="desktop" onViewModeChange={setViewMode} onCodeChange={(newCode) => { if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); } }} autoRun={previewAutoRun} onAutoRunStarted={() => setPreviewAutoRun(false)} onSessionUrl={(url) => setSandboxUrl(url)} />
                      </div>
                      {showConsolePanel && <ConsolePanel entries={consoleEntries} onClear={() => setConsoleEntries([])} className="h-48 border-t border-canvas-border" />}
                      {showNetworkPanel && <NetworkPanel requests={networkRequests} onClear={() => setNetworkRequests([])} className="h-48 border-t border-canvas-border" />}
                    </div>
                  )}
                  <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col`}>
                    {/* View mode toolbar in code-only mode */}
                    {viewMode === 'code' && (
                      <PreviewToolbar device={deviceMode} onDeviceChange={setDeviceMode} url={previewUrl || sandboxUrl || 'canvas.sanbayfusion.com'} onRefresh={handleRefreshPreview} showConsole={showConsolePanel} onToggleConsole={() => setShowConsolePanel(p => !p)} showNetwork={showNetworkPanel} onToggleNetwork={() => setShowNetworkPanel(p => !p)} zoom={previewZoom} onZoomChange={setPreviewZoom} canUndo={canUndo} onUndo={handleUndo} canRedo={canRedo} onRedo={handleRedo} versionIndex={historyIndex} versionTotal={codeHistory.length} onOpenExternal={previewUrl ? () => window.open(previewUrl, '_blank', 'noopener') : undefined} viewMode={viewMode} onViewModeChange={setViewMode} onEditorModeEdit={() => setEditorMode('edit')} />
                    )}
                    <div className="flex-1 min-h-0 flex">
                      {/* Inline File Explorer (only in full code mode) */}
                      {viewMode === 'code' && (
                        <div className="w-48 shrink-0 border-r border-canvas-border bg-canvas-card flex flex-col">
                          <div className="px-3 py-2 border-b border-canvas-border flex items-center gap-2">
                            <FileText className="w-3 h-3 text-canvas-muted-deep" />
                            <span className="text-[10px] font-semibold text-canvas-muted uppercase tracking-wider">Explorer</span>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <FileTree
                              files={projectFiles}
                              activeFile={activeFilePath}
                              onFileSelect={(path) => { setActiveFilePath(path); }}
                              darkMode={true}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CodeEditor filePath={activeFilePath || '/index.html'} darkMode={true} readOnly={true} />
                      </div>
                    </div>
                    <EditorStatusBar language={currentLanguage} gitBranch={gitBranch} gitStatus="clean" isConnected={true} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <PreviewToolbar device={deviceMode} onDeviceChange={setDeviceMode} url={previewUrl || sandboxUrl || 'canvas.sanbayfusion.com'} onRefresh={handleRefreshPreview} showConsole={showConsolePanel} onToggleConsole={() => setShowConsolePanel(p => !p)} showNetwork={showNetworkPanel} onToggleNetwork={() => setShowNetworkPanel(p => !p)} zoom={previewZoom} onZoomChange={setPreviewZoom} canUndo={canUndo} onUndo={handleUndo} canRedo={canRedo} onRedo={handleRedo} versionIndex={historyIndex} versionTotal={codeHistory.length} onOpenExternal={previewUrl ? () => window.open(previewUrl, '_blank', 'noopener') : undefined} viewMode={viewMode} onViewModeChange={setViewMode} onEditorModeEdit={() => setEditorMode('edit')} />
                  <div className="flex-1 min-h-0">
                    <SandpackPreview code={currentApp?.code || ''} language={(() => { const c = (currentApp?.code || '').trimStart(); const isHtml = c.startsWith('<!DOCTYPE') || c.startsWith('<html') || (c.startsWith('<') && (c.includes('</html>') || c.includes('</body>'))); return isHtml ? 'html' : ['react', 'nextjs'].includes(currentLanguage) ? 'react' : 'html'; })()} currentLanguage={currentLanguage} viewMode={viewMode} onViewModeChange={setViewMode} onCodeChange={(newCode) => { if (currentApp) { const updatedApp = { ...currentApp, code: newCode }; setCurrentApp(updatedApp); saveApp(updatedApp, false); } }} autoRun={previewAutoRun} onAutoRunStarted={() => setPreviewAutoRun(false)} onSessionUrl={(url) => setSandboxUrl(url)} />
                  </div>
                  {showConsolePanel && <ConsolePanel entries={consoleEntries} onClear={() => setConsoleEntries([])} className="h-48 border-t border-canvas-border" />}
                  {showNetworkPanel && <NetworkPanel requests={networkRequests} onClear={() => setNetworkRequests([])} className="h-48 border-t border-canvas-border" />}
                </div>
              )}
          </div>
        </main>
      </div>

      {/* Error Toast */}
      {genState.error && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm p-4 bg-canvas-card border border-primary-500/20 rounded-xl shadow-2xl flex gap-3 items-start">
          <div className="p-2 bg-primary-500/10 text-primary-400 rounded-lg shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-200">Error</h4>
            <p className="text-xs text-canvas-muted mt-1 leading-relaxed">{genState.error}</p>
            <button onClick={() => setGenState({ ...genState, error: null })} className="text-xs font-semibold text-primary-400 hover:text-primary-300 mt-2 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {/* Templates Panel */}
      <TemplatesPanel isOpen={isTemplatesPanelOpen} onClose={() => setIsTemplatesPanelOpen(false)} onUseTemplate={handleUseTemplate} selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} />

      {showDeployPanel && (
        <DeployPanel projectName={currentApp?.name || 'Untitled Project'} projectId={currentApp?.id || 'default'} files={useEditorStore.getState().files} onClose={() => setShowDeployPanel(false)} onDeployComplete={handleDeployComplete} onFixBuildError={handleFixBuildError} />
      )}

      {/* Analytics Drawer */}
      <AnalyticsDrawer
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        messages={currentApp?.history || []}
        isGenerating={genState.isGenerating}
        sessionStart={sessionStart}
        user={authUser}
        currentApp={currentApp ? { name: currentApp.name, language: currentApp.language } : null}
      />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* OVERLAY MODALS — Full feature panels via activeOverlay     */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveOverlay(null)}>
          <div className="relative w-[90vw] max-w-4xl max-h-[85vh] bg-canvas-card border border-canvas-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Overlay Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-canvas-border shrink-0">
              <h2 className="text-sm font-bold text-white capitalize">{activeOverlay.replace('-', ' ')}</h2>
              <button onClick={() => setActiveOverlay(null)} className="p-1.5 rounded-lg text-canvas-muted hover:text-white hover:bg-white/10 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Overlay Content */}
            <div className="flex-1 overflow-y-auto">
              {activeOverlay === 'ai-tools' && (
                <div className="h-full flex flex-col">
                  <div className="flex gap-1 p-3 border-b border-canvas-border">
                    {(['autofix', 'explain', 'refactor', 'test'] as const).map(tab => (
                      <button key={tab} onClick={() => setAiToolsTab(tab)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${aiToolsTab === tab ? 'bg-primary-500/20 text-primary-300' : 'text-canvas-muted hover:text-white hover:bg-white/[0.06]'}`}>
                        {tab === 'test' ? 'Test Writer' : tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {aiToolsTab === 'autofix' && <AIAutofix errors={[]} onFix={async (errorId) => { handleChatMessage(`Fix error: ${errorId}`); setActivePanel('workspace'); }} onFixAll={async () => { handleChatMessage('Fix all errors in the current code'); setActivePanel('workspace'); }} onNavigate={(file) => { setActiveFilePath(file); setViewMode('code'); }} />}
                    {aiToolsTab === 'explain' && <AIExplain onExplain={(code) => { handleChatMessage(`Explain this code:\n\`\`\`\n${code}\n\`\`\``); setActivePanel('workspace'); }} />}
                    {aiToolsTab === 'refactor' && <AIRefactor suggestions={[]} onApply={async (id) => { handleChatMessage(`Apply refactoring suggestion ${id}`); setActivePanel('workspace'); }} onDismiss={() => toast.info('Dismissed', 'Suggestion dismissed.')} onRefresh={() => { handleChatMessage('Analyze the current code and suggest refactoring improvements'); setActivePanel('workspace'); }} onNavigate={(file) => { setActiveFilePath(file); setViewMode('code'); }} />}
                    {aiToolsTab === 'test' && <AITestWriter tests={[]} onGenerate={(code, framework, type) => { handleChatMessage(`Write ${type} tests using ${framework} for:\n\`\`\`\n${code}\n\`\`\``); setActivePanel('workspace'); }} onRunTest={(id) => { handleChatMessage(`Run test ${id} and show results`); setActivePanel('workspace'); }} onRunAll={() => { handleChatMessage('Run all tests and show results'); setActivePanel('workspace'); }} onCopyTest={(code) => { navigator.clipboard.writeText(code); toast.success('Copied', 'Test code copied'); }} onAddToProject={(test) => { editorBridge.createFile(`/tests/${test.name || 'test'}.test.ts`, test.code); setProjectFiles(editorBridge.getProjectTree()); }} />}
                  </div>
                </div>
              )}
              {activeOverlay === 'billing' && (
                <div className="p-4 space-y-6">
                  <UsageDashboard plan="free" metrics={[{ label: 'API Calls', used: 0, limit: 1000, unit: 'calls', icon: 'tokens' as const }, { label: 'Storage', used: 0, limit: 5000, unit: 'MB', icon: 'storage' as const }, { label: 'Builds', used: 0, limit: 100, unit: 'builds', icon: 'compute' as const }]} />
                  <InvoiceHistory invoices={[]} onDownload={(id) => toast.info('Invoice', 'Invoice download will open in billing dashboard.')} onViewDetails={(id) => window.open('https://sanbayfusion.com/dashboard/billing', '_blank')} />
                </div>
              )}
              {activeOverlay === 'deploy-status' && <DeployStatus projectId={currentApp?.id || 'default'} />}
              {activeOverlay === 'domains' && <DomainManager projectId={currentApp?.id || 'default'} />}
              {activeOverlay === 'hosting' && <HostingDashboard projectId={currentApp?.id || 'default'} />}
              {activeOverlay === 'rollback' && <RollbackPanel projectId={currentApp?.id || 'default'} />}

            </div>
          </div>
        </div>
      )}

      {/* Agent Approval Banner */}
      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl border backdrop-blur-xl shadow-2xl max-w-md"
            style={{
              background: pendingApproval.severity === 'critical' ? 'rgba(239,68,68,0.15)' : pendingApproval.severity === 'high' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.12)',
              borderColor: pendingApproval.severity === 'critical' ? 'rgba(239,68,68,0.4)' : pendingApproval.severity === 'high' ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{pendingApproval.severity === 'critical' ? '🔴' : pendingApproval.severity === 'high' ? '🟠' : '🔵'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/90">{pendingApproval.action}</p>
                <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">{pendingApproval.description}</p>
                <p className="text-[9px] text-white/40 mt-1">Auto-approved</p>
              </div>
              <button onClick={() => setPendingApproval(null)} className="text-white/40 hover:text-white/80 transition-colors text-sm">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Question Quick-Replies */}
      <AnimatePresence>
        {pendingQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-5 py-4 rounded-xl border border-cyan-500/30 backdrop-blur-xl shadow-2xl max-w-lg"
            style={{ background: 'rgba(6,20,40,0.92)' }}
          >
            <p className="text-sm text-white/90 font-medium mb-3">{pendingQuestion.question}</p>
            {pendingQuestion.options.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pendingQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setPendingQuestion(null);
                      handleChatMessage(opt);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-white/50">Type your answer in the chat below</p>
            )}
            <button
              onClick={() => setPendingQuestion(null)}
              className="absolute top-2 right-3 text-white/40 hover:text-white/80 transition-colors text-sm"
            >✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Container */}
      <ToastContainer />

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
        <span className="text-[9px] text-gray-600">GenCraft Pro &middot; Powered by Maula AI</span>
        {activePlan && (
          <span className="text-[9px] text-gray-600">
            {activePlan.type.charAt(0).toUpperCase() + activePlan.type.slice(1)} Plan
            {activePlan.daysRemaining != null && <> &middot; {activePlan.daysRemaining}d left</>}
          </span>
        )}
      </div>
    </div>
  );
};

export default App;
