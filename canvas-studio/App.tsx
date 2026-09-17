import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GeneratedApp,
  ViewMode,
  GenerationState,
  ChatMessage,
  ModelOption,
  FileNode,
} from './types';
import Preview from './components/Preview';
import MonacoEditorComponent from './components/MonacoEditor';
import TabBar from './components/TabBar';
import FileTree from './components/FileTree';
import ChatBox from './components/ChatBox';
import CanvasNavDrawer from './components/CanvasNavDrawer';
import DeployPanel from './components/DeployPanel';
import StudioHub from './components/StudioHub';

import ErrorBoundary from './components/ErrorBoundary';
import TerminalComponent from './components/Terminal';

// Sidebar panels
import AgentPanel from './components/sidebar/AgentPanel';
import AssetBrowser from './components/sidebar/AssetBrowser';
import DatabasePanel from './components/sidebar/DatabasePanel';
// DependenciesPanel removed (unused)
import EnvironmentVars from './components/sidebar/EnvironmentVars';
import GitPanel from './components/sidebar/GitPanel';
import HistoryPanel from './components/sidebar/HistoryPanel';

// AI tools
import AIAutofix from './components/ai/AIAutofix';
import AIExplain from './components/ai/AIExplain';
import AIRefactor from './components/ai/AIRefactor';
import AITestWriter from './components/ai/AITestWriter';
import AIToolsPanel from './components/AIToolsPanel';
import AssetsPanel from './components/AssetsPanel';
import TemplatesPanel from './components/TemplatesPanel';
import { STUDIO_TEMPLATES, TEMPLATE_CATEGORIES } from './data/templateData';

// Deploy sub-panels
import DeployStatus from './components/deploy/DeployStatus';
import DomainManager from './components/deploy/DomainManager';
import HostingDashboard from './components/deploy/HostingDashboard';
import MonitoringDashboard from './components/deploy/MonitoringDashboard';
import RollbackPanel from './components/deploy/RollbackPanel';

// Editor enhancements
import BuildPanel from './components/editor/BuildPanel';
import EditorSettingsPanel from './components/editor/EditorSettings';
import EditorStatusBar from './components/editor/EditorStatusBar';
import SearchReplace from './components/editor/SearchReplace';

// Preview enhancements
import ConsolePanel from './components/preview/ConsolePanel';
import NetworkPanel from './components/preview/NetworkPanel';
import PreviewToolbar from './components/preview/PreviewToolbar';

// Billing
import InvoiceHistory from './components/billing/InvoiceHistory';
import UsageDashboard from './components/billing/UsageDashboard';

// Shared utility components
import ToastContainer, { toast } from './components/shared/Toast';
import { motion, AnimatePresence } from 'framer-motion';

// Top-level feature components
import ImageToCode from './components/ImageToCode';
import PlanStatusBar from './components/PlanStatusBar';
import VoiceInput from './components/VoiceInput';
import VideoEditorPanel from './components/video/VideoEditorPanel';
import ImageGenPanel from './components/ImageGenPanel';
import FileParsePanel from './components/FileParsePanel';
import SecurityScanPanel from './components/SecurityScanPanel';
import DataToolsPanel from './components/DataToolsPanel';

// New sidebar panels
import DraftsPanel from './components/sidebar/DraftsPanel';
import DashboardPanel from './components/sidebar/DashboardPanel';
import ProjectsPanelSidebar from './components/sidebar/ProjectsPanel';
import ProjectsPanel from './components/ProjectsPanel';
// CollaborationPanel sidebar version replaced by full-screen CollaborationPanel
import CollaborationPanel from './components/CollaborationPanel';
import WorkflowAutomationPanel from './components/sidebar/WorkflowAutomationPanel';
import KnowledgeGraphPanelSidebar from './components/sidebar/KnowledgeGraphPanel';
import KnowledgeGraphPanel from './components/KnowledgeGraphPanel';
import ArchivePanel from './components/ArchivePanel';
import WorkspacePanel from './components/WorkspacePanel';
import WebFrontendToolsPanel from './components/sidebar/WebFrontendToolsPanel';
import AIMLPanel from './components/sidebar/AIMLPanel';
import APIToolsPanel from './components/sidebar/APIToolsPanel';
import AnalyticsPanel from './components/sidebar/AnalyticsPanel';

import canvasAppsService from './services/canvasAppsService';
import { editorBridge } from './services/editorBridge';
import { buildEditorContextForAgent } from './services/agentProcessor';
import { useCanvasCamera } from './hooks/useCanvasCamera';
import settingsService from './services/settingsService';
import { generateCode, sendCanvasChat, sendAgentChatStream } from './services/canvasAIService';
import type { AgentStreamEvent } from './services/canvasAIService';
import { authService, AuthUser } from './services/authService';
import { billingService, PlanInfo } from './services/billingService';

// AI Models — Mistral (primary), xAI (fallback), OpenAI (fallback)
const MODELS: ModelOption[] = [
  {
    id: 'mistral-large-latest',
    name: 'Nova',
    provider: 'mistral',
    description: 'Mistral Large — primary agent. Excellent at code & reasoning.',
  },
  {
    id: 'grok-3',
    name: 'Architect',
    provider: 'xai',
    description: 'xAI Grok — fast, creative code generation.',
  },
  {
    id: 'gpt-4o',
    name: 'Vision Pro',
    provider: 'openai',
    description: 'OpenAI GPT-4o — best for image understanding & vision tasks.',
  },
];

// Fun loading messages that rotate while generating - Life commentary & dev humor
const FUN_LOADING_MESSAGES = [
  // Life Commentary & Philosophy
  { text: "While you wait, remember: Rome wasn't built in a day, but they weren't using AI either! 🏛️", emoji: "🤔", category: "life" },
  { text: "Plot twist: Your app is more patient than you are right now 😅", emoji: "⏳", category: "life" },
  { text: "Fun fact: You blink 15-20 times per minute. Count them. You're welcome for the distraction!", emoji: "👁️", category: "life" },
  { text: "Life hack: This is a great time to stretch. Your back will thank you later!", emoji: "🧘", category: "life" },
  { text: "Remember: Good things come to those who wait... and great apps come to those who use AI!", emoji: "✨", category: "life" },

  // Developer Jokes
  { text: "Why do programmers prefer dark mode? Because light attracts bugs! 🐛", emoji: "😂", category: "joke" },
  { text: "A SQL query walks into a bar, sees two tables and asks... 'Can I join you?'", emoji: "🍺", category: "joke" },
  { text: "There are only 10 types of people: those who understand binary and those who don't!", emoji: "🤓", category: "joke" },
  { text: "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!", emoji: "😢", category: "joke" },
  { text: "CSS is like relationships: It's all about the right positioning! 💕", emoji: "💑", category: "joke" },
  { text: "What's a programmer's favorite hangout? Foo Bar! 🍸", emoji: "🎉", category: "joke" },
  { text: "I told my computer a joke and it said 'ERROR 404: Humor not found'", emoji: "🤖", category: "joke" },

  // Sports Commentary Style
  { text: "AND THE AI IS OFF! Look at that processing speed! Absolutely magnificent!", emoji: "🏃", category: "sports" },
  { text: "The code is being assembled... OH WHAT A BEAUTIFUL COMPONENT STRUCTURE!", emoji: "⚽", category: "sports" },
  { text: "We're in the final stretch now! The CSS is looking IMMACULATE!", emoji: "🏆", category: "sports" },
  { text: "This app is going to be a SLAM DUNK! The crowd goes wild! 🎺", emoji: "🏀", category: "sports" },
  { text: "The AI has entered the zone! Pure concentration! Pure excellence!", emoji: "🎯", category: "sports" },

  // Movie/Drama Style
  { text: "*dramatic voice* In a world of boring apps... one AI dared to be different...", emoji: "🎬", category: "drama" },
  { text: "Coming soon to a browser near you: The App You've Been Waiting For!", emoji: "🎥", category: "drama" },
  { text: "*epic orchestra music* The pixels are aligning... destiny is being written...", emoji: "🎻", category: "drama" },
  { text: "Previously on 'Building Your App': The AI accepted the challenge...", emoji: "📺", category: "drama" },

  // Cooking Show Style
  { text: "Just adding a pinch of CSS, a dash of JavaScript, and voilà! 👨‍🍳", emoji: "🍳", category: "cooking" },
  { text: "Let that UI marinate for a few more seconds... perfection takes time!", emoji: "🥘", category: "cooking" },
  { text: "Today's special: Fresh components with a side of responsive design! 🍽️", emoji: "👩‍🍳", category: "cooking" },
  { text: "We're whisking those elements together for a smooth user experience!", emoji: "🥄", category: "cooking" },

  // Encouraging & Wholesome
  { text: "Your patience is impressive! You'd make a great developer 💪", emoji: "🌟", category: "wholesome" },
  { text: "Did you drink water today? Stay hydrated, friend! 💧", emoji: "💙", category: "wholesome" },
  { text: "You're doing amazing sweetie! The AI believes in you!", emoji: "🤗", category: "wholesome" },
  { text: "This app is being built with love, care, and lots of compute power ❤️", emoji: "💖", category: "wholesome" },
  { text: "Take a deep breath... Relax... Your app is in good hands! 🙌", emoji: "😌", category: "wholesome" },

  // Tech Geek Humor
  { text: "Currently converting caffeine into code... Standard operating procedure! ☕", emoji: "💻", category: "tech" },
  { text: "Deploying happiness.exe... No bugs detected (yet)! 🐛", emoji: "🚀", category: "tech" },
  { text: "Teaching pixels to cooperate... Some are more rebellious than others!", emoji: "🖼️", category: "tech" },
  { text: "Negotiating with the CSS gods... They demand more !important sacrifices!", emoji: "🙏", category: "tech" },
  { text: "The flexbox is flexing! The grid is gridding! Magic is happening!", emoji: "✨", category: "tech" },
  { text: "Aligning divs that don't want to be aligned... Classic Monday!", emoji: "😤", category: "tech" },
  { text: "Summoning the UI unicorns... They're fashionably late as always! 🦄", emoji: "🌈", category: "tech" },

  // Random Fun Facts
  { text: "Fun fact: An octopus has 3 hearts! Your app will only need 1 good design ❤️", emoji: "🐙", category: "fact" },
  { text: "Did you know? Honey never spoils! Neither will this awesome app!", emoji: "🍯", category: "fact" },
  { text: "A group of flamingos is called a 'flamboyance'... Just like this UI! 🦩", emoji: "💅", category: "fact" },

  // Motivational
  { text: "Every pixel is being placed with purpose! Every line of code matters!", emoji: "🎨", category: "motivation" },
  { text: "Great apps are made one component at a time. We're almost there!", emoji: "🏗️", category: "motivation" },
  { text: "The wait is worth it! Trust the process! 🌱", emoji: "🌳", category: "motivation" },
];

// STUDIO_TEMPLATES and TEMPLATE_CATEGORIES imported from './data/templateData'

// 6 Quick Actions
const QUICK_ACTIONS = [
  { id: 'dark-mode', label: 'Dark Mode', icon: '🌙', description: 'Add dark mode toggle to the app' },
  { id: 'responsive', label: 'Responsive', icon: '📱', description: 'Make the layout responsive' },
  { id: 'animations', label: 'Animations', icon: '✨', description: 'Add smooth animations' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿', description: 'Improve accessibility' },
  { id: 'loading', label: 'Loading', icon: '⏳', description: 'Add loading states' },
  { id: 'validation', label: 'Validation', icon: '✅', description: 'Add form validation' },
];

// Device preview sizes
const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '812px', label: 'Mobile' },
};

// Friendly error message helper — single source of truth in canvasAIService
import { getFriendlyErrorMessage } from './services/canvasAIService';

type ActivePanel = 'workspace' | 'assistant' | 'history' | 'files' | 'tools' | 'settings' | 'templates' | 'hub' | 'agent' | 'git' | 'assets' | 'ai-tools' | 'drafts' | 'dashboard' | 'projects' | 'collaboration' | 'workflow' | 'knowledge-graph' | 'archive' | 'web-tools' | 'ai-ml' | 'api-tools' | 'database' | 'dependencies' | 'env-vars' | 'image-to-code' | 'video' | 'analytics' | 'billing' | 'deploy-dashboard' | 'version-history' | 'search-replace' | 'build' | 'editor-settings' | 'monitoring' | 'image-gen' | 'file-parse' | 'security-scan' | 'data-tools' | null;

const FULL_WIDTH_PANELS = new Set<string>(['dashboard', 'history', 'hub', 'agent', 'database', 'dependencies', 'env-vars', 'image-to-code', 'video', 'analytics', 'billing', 'deploy-dashboard', 'version-history', 'search-replace', 'build', 'editor-settings', 'monitoring', 'image-gen', 'file-parse', 'security-scan', 'data-tools', 'web-tools', 'ai-ml', 'api-tools', 'git', 'ai-tools', 'assets', 'templates', 'collaboration', 'projects', 'drafts', 'knowledge-graph', 'archive', 'workspace']);
type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type ConversationPhase = 'initial' | 'gathering' | 'confirming' | 'building' | 'editing';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [selectedProvider, setSelectedProvider] = useState('mistral');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [currentApp, setCurrentApp] = useState<GeneratedApp | null>(null);
  const [history, setHistory] = useState<GeneratedApp[]>([]);
  const [activePanel, setActivePanel] = useState<ActivePanel>('workspace');

  // Compute the public preview URL for the current app once it has a real DB ID (CUID, not temp Date.now())
  const previewUrl = (() => {
    if (!currentApp?.id) return null;
    if (/^\d+$/.test(currentApp.id)) return null; // temp ID — not yet saved to DB
    const lang = (currentApp.language || 'html').toLowerCase();
    return `https://appview.sanbayfusion.com/app-${lang}-${currentApp.id}`;
  })();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>('initial');
  const [templateCategory, setTemplateCategory] = useState('all');
  // Editor Bridge state
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [useSurgicalEdits, setUseSurgicalEdits] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionStartRef = useRef(Date.now());
  const sidebarAnimationDoneRef = useRef(false);
  const billingDataRef = useRef<any>(null);
  const hostingDataRef = useRef<any>(null);
  const [sidebarHighlight, setSidebarHighlight] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [showDeployPanel, setShowDeployPanel] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  // Deploy history state
  const [deployHistory, setDeployHistory] = useState<any[]>([]);
  // Agent state
  const [agentMode, setAgentMode] = useState<'chat' | 'dev' | 'review'>('dev');
  const [agentNotification, setAgentNotification] = useState<{ text: string; type: 'info' | 'warning' | 'error'; id: number } | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{ action: string; description: string; severity: string } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<{ question: string; options: string[] } | null>(null);

  // Auth & Plan state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activePlan, setActivePlan] = useState<PlanInfo | null>(null);
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // ── Full-width panel features (formerly overlays) ──
  const [showConsolePanel, setShowConsolePanel] = useState(false);
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<{ id: string; level: 'log' | 'warn' | 'error' | 'info' | 'debug'; message: string; timestamp: number; source?: string }[]>([]);
  const [networkRequests, setNetworkRequests] = useState<{ id: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'; url: string; status: number; statusText: string; size: number; time: number; type: 'fetch' | 'xhr' | 'script' | 'style' | 'image' | 'font' | 'other'; timestamp: number; requestStatus: 'pending' | 'success' | 'error' | 'cancelled' }[]>([]);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [aiToolsTab, setAiToolsTab] = useState<'autofix' | 'explain' | 'refactor' | 'test'>('autofix');
  const [envVariables, setEnvVariables] = useState<{ key: string; value: string; isSecret: boolean; description?: string }[]>([]);
  const [gitFiles, setGitFiles] = useState<{ path: string; status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'; staged: boolean }[]>([]);
  const [gitCommits, setGitCommits] = useState<{ id: string; message: string; author: string; date: string; hash: string }[]>([]);
  const [gitBranch, setGitBranch] = useState('main');
  const [dependencies, setDependencies] = useState<{ name: string; version: string; latestVersion?: string; isDev: boolean; hasUpdate: boolean }[]>([]);
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);

  // ── Camera / Voice / Screenshot (extracted hook) ──
  const {
    isCameraActive, isSpeaking, facingMode,
    showCameraModal, capturedImage, setCapturedImage,
    videoRef, canvasRef,
    startCamera, stopCamera, switchCamera, takePhoto, savePhoto,
    captureScreenshot, speakText, toggleSpeaker,
  } = useCanvasCamera({ currentAppHistory: currentApp?.history });

  const [funMessageIndex, setFunMessageIndex] = useState(0);
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    progressMessage: '',
  });

  // Bridge console messages from the preview iframe into the ConsolePanel
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sandbox-console') {
        const { type, args, timestamp } = event.data.data;
        setConsoleEntries(prev => [...prev.slice(-199), {
          id: `${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
          level: type as 'log' | 'warn' | 'error' | 'info' | 'debug',
          message: args.join(' '),
          timestamp,
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Clear console when the generated app changes
  useEffect(() => {
    setConsoleEntries([]);
  }, [currentApp?.code]);

  // Rotate fun messages while generating
  useEffect(() => {
    if (!genState.isGenerating) return;

    const interval = setInterval(() => {
      setFunMessageIndex(prev => (prev + 1) % FUN_LOADING_MESSAGES.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, [genState.isGenerating]);

  // Cancel generation handler
  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGenState({
      isGenerating: false,
      error: null,
      progressMessage: '',
      isThinking: false,
    });
    // Add cancellation message to chat
    if (currentApp) {
      const cancelMsg: ChatMessage = {
        role: 'model',
        text: 'Generation cancelled. Feel free to ask me anything else!',
        timestamp: Date.now(),
      };
      setCurrentApp(prev => prev ? {
        ...prev,
        history: [...prev.history, cancelMsg],
      } : null);
    }
  }, [currentApp]);

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

        setAuthUser(authData.user);

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

  // Load dark mode preference from DB user settings
  useEffect(() => {
    const loadDarkMode = async () => {
      try {
        const settings = await settingsService.get();
        const pref = settings?.preferences?.canvasDarkMode;
        if (typeof pref === 'boolean') setIsDarkMode(pref);
      } catch { /* default to current state */ }
    };
    loadDarkMode();
  }, []);

  // Save dark mode preference to DB user settings
  useEffect(() => {
    const saveDarkMode = async () => {
      try {
        await settingsService.updatePreferences({ canvasDarkMode: isDarkMode });
      } catch { /* silently fail — non-critical */ }
    };
    saveDarkMode();
  }, [isDarkMode]);

  // Apply dark/light mode to body element
  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#0A0A0A' : '#ffffff';
    document.body.style.color = isDarkMode ? '#D1D5DB' : '#1f2937';
  }, [isDarkMode]);

  // currentApp lives in React state (in-memory) — DB is the source of truth.
  // No sessionStorage, no localStorage. On mount, apps load from DB via canvasAppsService.getApps().

  // Sync editorBridge with currentApp code
  useEffect(() => {
    if (currentApp?.code) {
      editorBridge.loadFromHtml(currentApp.code);
      setProjectFiles(editorBridge.getProjectTree());
      // Set active file and open initial tabs
      const allFiles = editorBridge.getAllFilePaths();
      if (!activeFilePath && editorBridge.getFile('/index.html')) {
        setActiveFilePath('/index.html');
      }
      // Open tabs for project files (up to first 5)
      if (openTabs.length === 0 && allFiles.length > 0) {
        setOpenTabs(allFiles.slice(0, 5));
      }
    }
  }, [currentApp?.code]);

  // Listen to editorBridge file changes
  useEffect(() => {
    const handleFileChange = () => {
      // Update project files tree
      setProjectFiles(editorBridge.getProjectTree());
      // Sync back to currentApp
      if (currentApp) {
        const newHtml = editorBridge.toHtml();
        setCurrentApp(prev => prev ? { ...prev, code: newHtml } : null);
      }
    };

    const unsubscribe = editorBridge.onFileChange(handleFileChange);
    return () => {
      unsubscribe();
    };
  }, [currentApp]);

  // Auto-scroll sidebar animation on page load to show users all options
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Check if user has seen the animation before (in-memory ref — runs once per page load)
    if (sidebarAnimationDoneRef.current) return;

    // Delay start for page to load
    const startDelay = setTimeout(() => {
      setSidebarHighlight(true);

      const scrollHeight = sidebar.scrollHeight;
      const clientHeight = sidebar.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll > 0) {
        // Smooth scroll down
        let scrollPos = 0;
        const scrollDown = setInterval(() => {
          scrollPos += 3;
          sidebar.scrollTop = scrollPos;
          if (scrollPos >= maxScroll) {
            clearInterval(scrollDown);
            // Pause at bottom
            setTimeout(() => {
              // Smooth scroll back up
              const scrollUp = setInterval(() => {
                scrollPos -= 3;
                sidebar.scrollTop = scrollPos;
                if (scrollPos <= 0) {
                  clearInterval(scrollUp);
                  setSidebarHighlight(false);
                  sidebarAnimationDoneRef.current = true;
                }
              }, 15);
            }, 500);
          }
        }, 15);
      } else {
        setSidebarHighlight(false);
      }
    }, 1000);

    return () => clearTimeout(startDelay);
  }, []);

  // Loading state for history
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load apps from database on mount
  useEffect(() => {
    const loadApps = async () => {
      setIsLoadingHistory(true);
      try {
        const apps = await canvasAppsService.getApps();
        setHistory(apps.slice(0, 20));
      } catch (e) {
        console.error('[App] Failed to load apps:', e);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadApps();
  }, []);

  // Save app to database
  const saveApp = useCallback(async (app: GeneratedApp, isNew: boolean = false) => {
    try {
      if (isNew) {
        const savedApp = await canvasAppsService.saveApp(app);
        if (savedApp) {
          setHistory(prev => [savedApp, ...prev.filter(a => a.id !== savedApp.id)].slice(0, 20));
          // Update currentApp with DB-generated ID so future updates use the correct ID
          setCurrentApp(prev => prev && prev.id === app.id ? savedApp : prev);
        } else {
          setHistory(prev => [app, ...prev.filter(a => a.id !== app.id)].slice(0, 20));
        }
      } else {
        const updatedApp = await canvasAppsService.updateApp(app.id, app);
        if (updatedApp) {
          setHistory(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a));
        } else {
          setHistory(prev => prev.map(a => a.id === app.id ? app : a));
        }
      }
    } catch (error) {
      console.error('[App] Save error:', error);
      if (isNew) {
        setHistory(prev => [app, ...prev.filter(a => a.id !== app.id)].slice(0, 20));
      } else {
        setHistory(prev => prev.map(a => a.id === app.id ? app : a));
      }
    }
  }, []);

  // Legacy saveHistory - updates React state only (DB is source of truth)
  const saveHistory = useCallback((newHistory: GeneratedApp[]) => {
    setHistory(newHistory.slice(0, 20));
  }, []);

  /**
   * AGENT PANEL MODE - Conversational AI Handler
   * Uses: /api/canvas/chat
   * Behavior: Nova chats naturally, only builds when user clearly requests it
   * - Greetings → friendly response, no code
   * - Questions → discusses ideas, no code
   * - Clear build request → generates code + explanation
   */
  const handleMessage = async (message: string, fileData?: { name: string; type: string; base64: string } | null, mode?: 'agent' | 'chat') => {
    if (!message.trim() || genState.isGenerating) return;

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

    // Add user message to history immediately
    const userMsg: ChatMessage = {
      role: 'user',
      text: message,
      timestamp: Date.now(),
    };

    // Update current app history with user message
    if (currentApp) {
      setCurrentApp(prev => prev ? {
        ...prev,
        history: [...prev.history, userMsg],
      } : null);
    } else {
      // Create temporary conversation if no app exists
      setCurrentApp({
        id: Date.now().toString(),
        name: 'New Chat',
        code: '',
        prompt: message,
        timestamp: Date.now(),
        history: [userMsg],
      });
    }

    // Set thinking state (not generating yet)
    setGenState({
      isGenerating: false,
      error: null,
      progressMessage: '',
      isThinking: true,
    });

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const editorContext = buildEditorContextForAgent();
      const effectiveMode = mode || 'agent';

      // ── CHAT-ONLY MODE — simple text response, no tools ──
      if (effectiveMode === 'chat') {
        const chatResponse = await sendCanvasChat(
          {
            message,
            provider: selectedModel.provider,
            modelId: selectedModel.id,
            currentCode: currentApp?.code || '',
            conversationHistory: currentApp?.history?.slice(-20) || [],
            editorContext,
            chatMode: 'chat',
          },
          abortControllerRef.current?.signal,
        );
        const modelMsg: ChatMessage = { role: 'model', text: chatResponse.message || 'Done!', timestamp: Date.now() };
        setCurrentApp(prev => {
          if (prev) {
            const updatedApp = { ...prev, history: [...prev.history, modelMsg] };
            saveApp(updatedApp, false);
            return updatedApp;
          } else {
            const newApp: GeneratedApp = { id: Date.now().toString(), name: message.substring(0, 30) + '...', code: '', prompt: message, timestamp: Date.now(), history: [userMsg, modelMsg] };
            saveApp(newApp, true);
            return newApp;
          }
        });
        setGenState({ isGenerating: false, error: null, progressMessage: '', isThinking: false });
        return;
      }

      // ── AGENTIC MODE — Nova gets real tools (file ops, web search, etc.) ──
      // Collect all project files so the agent can read/reference them
      const currentFiles: Record<string, string> = {};
      editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => {
        currentFiles[f.path] = f.content;
      });

      let filesModified = false;
      let accumulatedText = '';

      // Helper: apply a file-modifying tool result to editorBridge
      const applyToolResult = (event: AgentStreamEvent) => {
        const result = event.result as Record<string, any> | undefined;
        if (!result?.success) return;

        // ── UI Events (permissions, notifications, questions) ──
        if (result._uiEvent) {
          const act = result.action as string;
          switch (act) {
            case 'show_message':
              toast.info('Nova', result.text || 'Info');
              setAgentNotification({ text: result.text || 'Info', type: 'info', id: Date.now() });
              break;
            case 'show_warning':
              toast.warning('Nova', result.text || 'Warning');
              setAgentNotification({ text: result.text || 'Warning', type: 'warning', id: Date.now() });
              break;
            case 'show_error':
              toast.error('Nova', result.text || 'Error');
              setAgentNotification({ text: result.text || 'Error', type: 'error', id: Date.now() });
              break;
            case 'request_approval':
              setPendingApproval({
                action: result.approval?.action || 'Unknown action',
                description: result.approval?.description || '',
                severity: result.approval?.severity || 'low',
              });
              break;
            case 'check_permission':
              toast.info('Permission', `${result.checkedAction || 'action'}: allowed`);
              break;
            case 'ask_user':
              setPendingQuestion({
                question: result.question || 'What would you like to do?',
                options: result.options || [],
              });
              break;
          }
          return; // UI events don't modify files
        }

        if (!result.action) return;

        const action = result.action as string;
        switch (action) {
          case 'update_file': {
            const filePath = result.path as string;
            const content = result.content as string;
            const exists = editorBridge.getFile(filePath) !== null;
            const ok = exists
              ? editorBridge.updateFile(filePath, content)
              : editorBridge.createFile(filePath, content);
            if (ok) filesModified = true;
            break;
          }
          case 'delete_file':
            if (editorBridge.deleteFile(result.path as string)) filesModified = true;
            break;
          case 'rename_file':
            if (editorBridge.renameFile(result.oldPath as string, result.newPath as string)) filesModified = true;
            break;
          case 'copy_file': {
            const destPath = result.destinationPath as string;
            const content = result.content as string;
            const exists = editorBridge.getFile(destPath) !== null;
            const ok = exists
              ? editorBridge.updateFile(destPath, content)
              : editorBridge.createFile(destPath, content);
            if (ok) filesModified = true;
            break;
          }
          case 'create_folder':
            // editorBridge doesn't have an explicit folder concept — folders are implicit from file paths
            break;
          case 'append_to_file': {
            const filePath = result.path as string;
            const existing = editorBridge.getFile(filePath);
            if (existing !== null) {
              editorBridge.updateFile(filePath, existing + (result.content as string));
              filesModified = true;
            }
            break;
          }
        }
      };

      // Stream events from the agentic endpoint
      const chatResponse = await sendAgentChatStream(
        {
          message,
          provider: selectedModel.provider,
          modelId: selectedModel.id,
          currentFiles,
          conversationHistory: currentApp?.history?.slice(-20) || [],
          editorContext,
          fileData: fileData || undefined,
        },
        (event: AgentStreamEvent) => {
          switch (event.type) {
            case 'thinking':
              setGenState({ isGenerating: false, error: null, progressMessage: event.message || 'Thinking...', isThinking: true });
              break;
            case 'tool_start':
              setGenState({ isGenerating: true, error: null, progressMessage: `Using ${event.name}...`, isThinking: false });
              break;
            case 'tool_result':
              applyToolResult(event);
              break;
            case 'text_delta':
              accumulatedText += event.text || '';
              break;
            case 'round':
              setGenState({ isGenerating: true, error: null, progressMessage: `Working... (step ${event.round})`, isThinking: false });
              break;
          }
        },
        abortControllerRef.current?.signal,
      );

      // Also apply any tool results from the 'done' event (belt-and-suspenders)
      if (chatResponse.toolResults?.length) {
        for (const tr of chatResponse.toolResults) {
          if (tr.result && (tr.result as any).action) {
            applyToolResult({ type: 'tool_result', name: tr.name, arguments: tr.arguments, result: tr.result });
          }
        }
      }

      const finalText = chatResponse.message || accumulatedText || 'Done!';
      const modelMsg: ChatMessage = { role: 'model', text: finalText, timestamp: Date.now() };

      // Save to app state
      if (filesModified) {
        setGenState({ isGenerating: true, error: null, progressMessage: 'Applying changes...', isThinking: false });
        await new Promise(resolve => setTimeout(resolve, 300));

        const newHtml = editorBridge.toHtml();
        setCurrentApp(prev => {
          if (prev) {
            const updatedApp = { ...prev, code: newHtml, history: [...prev.history, modelMsg] };
            saveApp(updatedApp, false);
            return updatedApp;
          } else {
            const newApp: GeneratedApp = {
              id: Date.now().toString(),
              name: message.substring(0, 30) + '...',
              code: newHtml,
              prompt: message,
              timestamp: Date.now(),
              history: [userMsg, modelMsg],
            };
            saveApp(newApp, true);
            return newApp;
          }
        });
        setProjectFiles(editorBridge.getProjectTree());
        setViewMode(ViewMode.PREVIEW);
      } else {
        // Chat-only response — no file modifications
        setCurrentApp(prev => {
          if (prev) {
            const updatedApp = { ...prev, history: [...prev.history, modelMsg] };
            saveApp(updatedApp, false);
            return updatedApp;
          } else {
            const newApp: GeneratedApp = { id: Date.now().toString(), name: message.substring(0, 30) + '...', code: '', prompt: message, timestamp: Date.now(), history: [userMsg, modelMsg] };
            saveApp(newApp, true);
            return newApp;
          }
        });
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '', isThinking: false });

    } catch (err: any) {
      // Don't show error if request was aborted (user cancelled)
      if (err.name === 'AbortError') {
        return;
      }

      // Convert raw error to user-friendly message
      const friendlyError = getFriendlyErrorMessage(err.message);

      setGenState({
        isGenerating: false,
        error: friendlyError,
        progressMessage: '',
        isThinking: false,
      });

      // Add error message to history
      const errorMsg: ChatMessage = {
        role: 'model',
        text: friendlyError,
        timestamp: Date.now(),
      };
      if (currentApp) {
        setCurrentApp(prev => prev ? {
          ...prev,
          history: [...prev.history, errorMsg],
        } : null);
      }
    }
  };

  /**
   * WORKSPACE MODE - Direct Code Generation Handler
   * Uses: /api/canvas/generate
   * Behavior: Immediately generates code without conversation
   * - Takes prompt and generates complete HTML app
   * - No questions, no conversation - just builds
   * - Used by: Workspace panel, Templates, Quick Actions
   */
  const handleGenerate = async (
    instruction: string,
    isInitial: boolean = false
  ) => {
    if (!instruction.trim() || genState.isGenerating) return;

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

    setGenState({
      isGenerating: true,
      error: null,
      progressMessage: `Generating with ${selectedModel.name}...`,
      isThinking: selectedModel.isThinking,
    });

    try {
      // Use canvasAIService.generateCode — no inline fetch
      const code = await generateCode({
        prompt: instruction,
        provider: selectedModel.provider,
        modelId: selectedModel.id,
        isThinking: selectedModel.isThinking || false,
        currentCode: isInitial ? undefined : currentApp?.code,
        history: isInitial ? [] : currentApp?.history,
      });

      const userMsg: ChatMessage = {
        role: 'user',
        text: instruction,
        timestamp: Date.now(),
      };
      const modelMsg: ChatMessage = {
        role: 'model',
        text: isInitial ? 'Application built!' : 'Changes applied.',
        timestamp: Date.now(),
      };

      if (isInitial) {
        const newApp: GeneratedApp = {
          id: Date.now().toString(),
          name: instruction.substring(0, 30) + '...',
          code,
          prompt: instruction,
          timestamp: Date.now(),
          history: [modelMsg],
        };
        setCurrentApp(newApp);
        // Save new app to database
        saveApp(newApp, true);
      } else if (currentApp) {
        const updatedApp = {
          ...currentApp,
          code,
          history: [...currentApp.history, userMsg, modelMsg],
        };
        setCurrentApp(updatedApp);
        // Update existing app in database
        saveApp(updatedApp, false);
      }

      setGenState({ isGenerating: false, error: null, progressMessage: '' });
      setViewMode(ViewMode.PREVIEW);
    } catch (err: any) {
      // Convert raw error to user-friendly message
      const friendlyError = getFriendlyErrorMessage(err.message);

      setGenState({
        isGenerating: false,
        error: friendlyError,
        progressMessage: '',
      });
    }
  };

  const togglePanel = (panel: ActivePanel) => {
    // If currently open and same panel → allow closing without auth
    if (activePanel === panel) { setActivePanel(null); return; }
    if (!authUser) { setShowLoginModal(true); return; }
    if (!activePlan) { setShowPurchaseModal(true); return; }
    // Clear cached data when switching panels so fresh data loads on re-open
    if (panel !== 'billing') billingDataRef.current = null;
    if (panel !== 'deploy-dashboard') hostingDataRef.current = null;
    setActivePanel(panel);
  };

  // Camera functions - selfie style with front/back camera
  // → Extracted to useCanvasCamera hook

  // Navigation drawer handler
  const handleNavigate = (action: string) => {
    setShowNavDrawer(false);

    // Gate panel-opening actions (closing panels is always allowed)
    const panelActions = ['workspace', 'assistant', 'history', 'files', 'tools', 'settings', 'templates', 'hub'];
    if (panelActions.includes(action)) {
      if (!authUser) { setShowLoginModal(true); return; }
      if (!activePlan) { setShowPurchaseModal(true); return; }
    }

    switch (action) {
      case 'workspace':
        setActivePanel('workspace');
        break;
      case 'assistant':
        setActivePanel('assistant');
        break;
      case 'history':
        setActivePanel('history');
        break;
      case 'files':
        setActivePanel('files');
        break;
      case 'tools':
        setActivePanel('tools');
        break;
      case 'settings':
        setActivePanel('settings');
        break;
      case 'templates':
        setActivePanel('templates');
        break;
      case 'hub':
        setActivePanel('hub');
        break;
      case 'deploy':
        setShowDeployPanel(true);
        break;
      case 'main-app':
        window.location.href = 'https://sanbayfusion.com/home';
        break;
      default:
        break;
    }
  };

  // Gate helper — called before any action that requires login + plan
  const requireAuth = (action: () => void) => {
    if (!authUser) { setShowLoginModal(true); return; }
    if (!activePlan) { setShowPurchaseModal(true); return; }
    action();
  };

  const openInNewTab = () => {
    if (currentApp?.code) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(currentApp.code);
        newWindow.document.close();
      }
    }
  };

  const deleteProject = async () => {
    if (currentApp && confirm('Delete this project?')) {
      // Delete from database
      await canvasAppsService.deleteApp(currentApp.id);
      setHistory(history.filter(h => h.id !== currentApp.id));
      setCurrentApp(null);
    }
  };

  const copyCode = () => {
    if (currentApp?.code) {
      navigator.clipboard.writeText(currentApp.code);
      toast.success('Copied', 'Code copied to clipboard');
    }
  };

  // Open in Editor - Switch to code view
  const handleOpenEditor = () => {
    setViewMode(ViewMode.CODE);
  };

  // Tab management helpers
  const openFileInTab = useCallback((path: string) => {
    setActiveFilePath(path);
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
    setViewMode(ViewMode.CODE);
  }, []);

  const closeTab = useCallback((path: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(p => p !== path);
      // If we closed the active tab, switch to the nearest tab
      if (activeFilePath === path && next.length > 0) {
        const idx = prev.indexOf(path);
        setActiveFilePath(next[Math.min(idx, next.length - 1)]);
      } else if (next.length === 0) {
        setViewMode(ViewMode.PREVIEW);
      }
      return next;
    });
  }, [activeFilePath]);

  // Open in CodeSandbox — multi-file export
  const handleOpenSandbox = () => {
    if (!currentApp?.code) return;

    // Use editorBridge to get ALL project files (HTML + CSS + JS)
    const projectFiles = editorBridge.toProjectFiles();

    // Build CodeSandbox files object from all project files
    const sandboxFiles: Record<string, { content: string; isBinary: false }> = {};
    for (const file of projectFiles) {
      // Strip leading slash for CodeSandbox paths
      const sandboxPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      sandboxFiles[sandboxPath] = { content: file.content, isBinary: false };
    }

    // Ensure package.json exists
    if (!sandboxFiles['package.json']) {
      sandboxFiles['package.json'] = {
        content: JSON.stringify({
          name: currentApp.name?.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'canvas-studio-app',
          version: '1.0.0',
          description: 'Created with sanbayfusion.com Canvas Studio',
          main: 'index.html'
        }, null, 2),
        isBinary: false
      };
    }

    const parameters = { files: sandboxFiles };

    // Encode for URL (using LZ-string or base64)
    const encoded = btoa(JSON.stringify(parameters));

    // Open CodeSandbox
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
    form.target = '_blank';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'parameters';
    input.value = encoded;
    form.appendChild(input);

    const queryInput = document.createElement('input');
    queryInput.type = 'hidden';
    queryInput.name = 'query';
    queryInput.value = 'file=/index.html';
    form.appendChild(queryInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Download project as ZIP — uses merged HTML from editorBridge
  const handleDownloadZip = async () => {
    if (!currentApp?.code) return;

    // Get the fully merged HTML (with CSS/JS re-injected)
    const html = editorBridge.toHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentApp.name?.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'canvas-app'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Push to GitHub — downloads code for manual push
  const handlePushToGitHub = () => {
    toast.info('GitHub Push', 'Download your project and push via git CLI.');
    handleExportCode();
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-canvas-card text-canvas-text matrix-bg' : 'bg-gray-100 text-gray-800'}`}>

      {/* ============================================================ */}
      {/* BRANDED DRAWER — Full-screen Neural Interface overlay */}
      {/* ============================================================ */}
      <div
        className={`fixed inset-0 z-[200] transition-all duration-700 ease-[cubic-bezier(0.7,0,0.3,1)] flex flex-col ${isDrawerOpen ? 'translate-y-0' : '-translate-y-full'}`}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-canvas-main" />

        {/* Hex grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0L60 17.3v17.4L30 52 0 34.7V17.3z' fill='none' stroke='%2306b6d4' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 52px' }} />

        {/* Cyan radial glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-800/[0.03] rounded-full blur-[120px]" />
        </div>

        {/* Bottom edge glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500/20 shadow-[0_5px_15px_rgba(6,182,212,0.3)]" />

        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="w-full h-full bg-[linear-gradient(rgba(6,182,212,0.15)_1px,transparent_1px)] bg-[length:100%_4px] animate-pulse" />
        </div>

        {/* Main Content — Centered branding */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-4 overflow-y-auto gap-4">
          {/* ASCII Art Logo */}
          <pre className="text-cyan-500 leading-[1.15] text-center font-mono select-none shrink-0" style={{ fontSize: 'clamp(7px, 1.6vmin, 14px)', textShadow: '0 0 20px rgba(6,182,212,0.4)' }}>
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

          {/* Enter Button — wraps title + tagline */}
          <div className="relative">
            <button
              onClick={() => { setIsDrawerOpen(false); }}
              className="relative group bg-black/40 overflow-hidden border border-cyan-500/50 px-8 py-3 rounded-sm transition-all hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] active:scale-95 cursor-pointer"
            >
              <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex flex-col items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-200 text-center tracking-tight group-hover:text-white transition-colors">
                  <span className="text-cyan-400" style={{ textShadow: '0 0 30px rgba(6,182,212,0.5)' }}>Canvas</span>
                  <span className="text-teal-400 ml-2" style={{ textShadow: '0 0 30px rgba(20,184,166,0.5)' }}>Studio</span>
                </h1>
                <p className="text-canvas-muted-deep font-mono text-[10px] uppercase tracking-[0.35em] mt-0.5 animate-pulse group-hover:text-canvas-text transition-colors">
                  Neural Code Architecture
                </p>
              </div>
            </button>
            {/* Decorative corner brackets */}
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-900/40" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-900/40" />
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Dashboard', href: 'https://sanbayfusion.com/dashboard/canvas-studio', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2-15.86c1.03.13 2 .45 2.87.93H15v-0.93zM15 7h3.58c.76.89 1.33 1.91 1.67 3H15V7zm0 5h5.24c.01.17.01.33.01.5 0 .67-.06 1.33-.18 1.97H15v-2.47zm0 4.47h4.42c-.76 1.51-1.97 2.77-3.43 3.61V16.47z' },
              { label: 'AI Chat', href: 'https://demo.sanbayfusion.com', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
              { label: 'GenCraft', href: 'https://canvas.sanbayfusion.com', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
              { label: 'Home', href: 'https://sanbayfusion.com/home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-canvas-border bg-white/[0.02] text-canvas-muted hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-sm font-mono uppercase tracking-wider"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={link.icon} />
                </svg>
                {link.label}
              </a>
            ))}
          </div>

          {/* Footer Status Bar */}
          <div className="flex items-center justify-center">
            <div className="grid grid-cols-3 gap-10 text-xs text-gray-600 font-mono uppercase tracking-widest">
              <div className="text-center group">
                <div className="text-cyan-900 group-hover:text-cyan-500 transition-colors mb-1">SECURE_LINK</div>
                <div className="font-bold">[OK]</div>
              </div>
              <div className="text-center group">
                <div className="text-cyan-900 group-hover:text-cyan-500 transition-colors mb-1">CORE_LOAD</div>
                <div className="font-bold">[READY]</div>
              </div>
              <div className="text-center group">
                <div className="text-cyan-900 group-hover:text-cyan-500 transition-colors mb-1">UPLINK_UP</div>
                <div className="font-bold text-cyan-400">[ACTIVE]</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-2" />

        {/* Bottom micro text */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-[8px] text-gray-800 font-mono uppercase tracking-[0.5em] opacity-30">
            Authorized Access Only // Terminal ID: 0xCS-PRO
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* 1. Left Vertical Nav Bar - Neural Style */}
        <nav className={`w-16 ${isDarkMode ? 'bg-canvas-card/95 border-gray-800/50' : 'bg-white border-gray-200'} backdrop-blur-md flex flex-col items-center shrink-0 z-[60] border-r relative`}>
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setShowNavDrawer(true)}
            className={`w-full py-2 flex justify-center items-center border-b ${isDarkMode ? 'border-gray-800/50 hover:bg-cyan-500/10' : 'border-gray-200 hover:bg-cyan-500/5'} transition-all duration-300 group`}
          >
            <div className="relative">
              <svg className={`w-5 h-5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} group-hover:text-cyan-300 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-cyan-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* Logo */}
          <div className={`py-3 border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'} w-full flex justify-center`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-900/30">
              <img
                src="/logo.png"
                alt="sanbayfusion.com"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Scrollable Icon Area */}
          <div
            ref={sidebarRef}
            className={`flex-1 overflow-y-auto overflow-x-hidden py-2 w-full custom-scrollbar transition-all duration-500 ${sidebarHighlight ? 'bg-gradient-to-b from-cyan-500/10 via-transparent to-cyan-500/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.15)]' : ''}`}
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="flex flex-col items-center gap-1 px-2">
              {/* Home */}
              <button onClick={() => window.location.href = 'https://sanbayfusion.com/home'} className={`p-2.5 rounded-lg ${isDarkMode ? 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10' : 'text-canvas-muted hover:text-cyan-600 hover:bg-cyan-50'} transition-all w-full flex justify-center border border-transparent ${isDarkMode ? 'hover:border-cyan-500/20' : 'hover:border-cyan-200'}`} title="Home">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>

              {/* Workspace */}
              <button onClick={() => togglePanel('workspace')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'workspace' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Workspace">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>

              {/* AI Assistant */}
              <button onClick={() => togglePanel('assistant')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'assistant' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="AI Assistant">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {/* Drafts */}
              <button onClick={() => togglePanel('drafts')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'drafts' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Drafts">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* Files */}
              <button onClick={() => togglePanel('files')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'files' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Files">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>

              {/* Dashboard */}
              <button onClick={() => togglePanel('dashboard')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'dashboard' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-canvas-muted-deep hover:text-indigo-400 hover:bg-indigo-500/10 border-transparent hover:border-indigo-500/20'}`} title="Dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>

              {/* History */}
              <button onClick={() => togglePanel('history')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'history' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="History">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Studio Hub */}
              <button onClick={() => togglePanel('hub')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'hub' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Studio Hub">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

              {/* AI Agent */}
              <button onClick={() => togglePanel('agent')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'agent' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'text-canvas-muted-deep hover:text-violet-400 hover:bg-violet-500/10 border-transparent hover:border-violet-500/20'}`} title="AI Agent">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v1m0 4h.01" />
                </svg>
              </button>

              {/* Git */}
              <button onClick={() => togglePanel('git')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'git' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'text-canvas-muted-deep hover:text-orange-400 hover:bg-orange-500/10 border-transparent hover:border-orange-500/20'}`} title="Git">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>

              {/* Assets */}
              <button onClick={() => togglePanel('assets')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'assets' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : 'text-canvas-muted-deep hover:text-pink-400 hover:bg-pink-500/10 border-transparent hover:border-pink-500/20'}`} title="Assets">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* AI Tools */}
              <button onClick={() => togglePanel('ai-tools')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'ai-tools' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-canvas-muted-deep hover:text-amber-400 hover:bg-amber-500/10 border-transparent hover:border-amber-500/20'}`} title="AI Tools">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>

              {/* Tools */}
              <button onClick={() => togglePanel('tools')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'tools' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Tools">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <div className="w-8 border-t border-gray-800/50 my-2"></div>

              {/* Preview Mode */}
              <button onClick={() => setViewMode(ViewMode.PREVIEW)} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${viewMode === ViewMode.PREVIEW ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-canvas-muted-deep hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>

              {/* Code Mode */}
              <button onClick={() => setViewMode(ViewMode.CODE)} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${viewMode === ViewMode.CODE ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-canvas-muted-deep hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Code">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>

              {/* Split Mode */}
              <button onClick={() => setViewMode(ViewMode.SPLIT)} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${viewMode === ViewMode.SPLIT ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-canvas-muted-deep hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Split View">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>

              {/* Terminal Toggle */}
              <button onClick={() => setShowTerminal(!showTerminal)} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${showTerminal ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Terminal">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <div className="w-8 border-t border-gray-800/50 my-2"></div>

              {/* Desktop Preview */}
              <button onClick={() => setDeviceMode('desktop')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${deviceMode === 'desktop' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'text-canvas-muted-deep hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`} title="Desktop Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Tablet Preview */}
              <button onClick={() => setDeviceMode('tablet')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${deviceMode === 'tablet' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'text-canvas-muted-deep hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`} title="Tablet Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Mobile Preview */}
              <button onClick={() => setDeviceMode('mobile')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${deviceMode === 'mobile' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'text-canvas-muted-deep hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`} title="Mobile Preview">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Camera */}
              <button onClick={() => isCameraActive ? stopCamera() : startCamera()} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${isCameraActive ? 'bg-primary-500/20 text-primary-400 border-primary-500/30' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Camera (Selfie)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Speaker - Listen to Agent */}
              <button onClick={toggleSpeaker} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${isSpeaking ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse' : 'text-canvas-muted-deep hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Listen to Agent">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>

              {/* Deploy to 3rd Party */}
              <button
                onClick={() => setShowDeployPanel(true)}
                disabled={!currentApp?.code}
                className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${showDeployPanel ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : currentApp?.code ? 'text-canvas-muted-deep hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20' : 'text-gray-700 border-transparent cursor-not-allowed'}`}
                title="Deploy to Vercel, Railway, Netlify, Cloudflare"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </button>

              {/* Screenshot - Screen Capture */}
              <button onClick={captureScreenshot} className="p-2.5 rounded-lg text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 transition-all w-full flex justify-center border border-transparent hover:border-cyan-500/20" title="Screenshot (Screen Capture)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Share */}
              <button onClick={copyCode} className="p-2.5 rounded-lg text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 transition-all w-full flex justify-center border border-transparent hover:border-cyan-500/20" title="Share">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>

              {/* Open in New Tab */}
              <button onClick={openInNewTab} className="p-2.5 rounded-xl text-canvas-muted hover:text-white hover:bg-white/5 transition-all w-full flex justify-center" title="Open in New Tab">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>

              {/* Delete */}
              <button onClick={deleteProject} className="p-2.5 rounded-xl text-canvas-muted hover:text-primary-400 hover:bg-primary-500/10 transition-all w-full flex justify-center" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Templates */}
              <button onClick={() => togglePanel('templates')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'templates' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Templates">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </button>

              {/* Deploy Panel */}
              <button onClick={() => togglePanel('deploy-dashboard')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'deploy-dashboard' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-canvas-muted-deep hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Deploy Panel">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

              {/* Credentials / Environment Variables */}
              <button onClick={() => togglePanel('env-vars')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'env-vars' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-canvas-muted-deep hover:text-yellow-400 hover:bg-yellow-500/10 border-transparent hover:border-yellow-500/20'}`} title="Credentials">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </button>

              {/* Video Generation */}
              <button onClick={() => togglePanel('video')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'video' ? 'bg-primary-500/20 text-primary-400 border-primary-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-canvas-muted-deep hover:text-primary-400 hover:bg-primary-500/10 border-transparent hover:border-primary-500/20'}`} title="Video Generation">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Projects */}
              <button onClick={() => togglePanel('projects')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'projects' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.2)]' : 'text-canvas-muted-deep hover:text-teal-400 hover:bg-teal-500/10 border-transparent hover:border-teal-500/20'}`} title="Projects">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

              {/* Build */}
              <button onClick={() => togglePanel('build')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'build' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'text-canvas-muted-deep hover:text-orange-400 hover:bg-orange-500/10 border-transparent hover:border-orange-500/20'}`} title="Build">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </button>

              {/* Database */}
              <button onClick={() => togglePanel('database')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'database' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-canvas-muted-deep hover:text-blue-400 hover:bg-blue-500/10 border-transparent hover:border-blue-500/20'}`} title="Database">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </button>

              <div className="w-8 border-t border-gray-800/50 my-2"></div>

              {/* Collaboration */}
              <button onClick={() => togglePanel('collaboration')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'collaboration' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.2)]' : 'text-canvas-muted-deep hover:text-sky-400 hover:bg-sky-500/10 border-transparent hover:border-sky-500/20'}`} title="Collaboration">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>

              <div className="w-8 border-t border-gray-800/50 my-2"></div>

              {/* Workflow Automation */}
              <button onClick={() => togglePanel('workflow')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'workflow' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.2)]' : 'text-canvas-muted-deep hover:text-fuchsia-400 hover:bg-fuchsia-500/10 border-transparent hover:border-fuchsia-500/20'}`} title="Workflow Automation">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Knowledge Graph */}
              <button onClick={() => togglePanel('knowledge-graph')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'knowledge-graph' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-canvas-muted-deep hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`} title="Knowledge Graph">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>

              {/* Archive */}
              <button onClick={() => togglePanel('archive')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'archive' ? 'bg-gray-500/20 text-canvas-text border-gray-500/30 shadow-[0_0_10px_rgba(107,114,128,0.2)]' : 'text-canvas-muted-deep hover:text-canvas-text hover:bg-gray-500/10 border-transparent hover:border-gray-500/20'}`} title="Archive">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>

              {/* Dev Tools */}
              <button onClick={() => togglePanel('data-tools')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'data-tools' ? 'bg-lime-500/20 text-lime-400 border-lime-500/30 shadow-[0_0_10px_rgba(132,204,22,0.2)]' : 'text-canvas-muted-deep hover:text-lime-400 hover:bg-lime-500/10 border-transparent hover:border-lime-500/20'}`} title="Dev Tools">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>

              {/* Web & Frontend Tools */}
              <button onClick={() => togglePanel('web-tools')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'web-tools' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="Web & Frontend Tools">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </button>

              {/* AI & Machine Learning */}
              <button onClick={() => togglePanel('ai-ml')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'ai-ml' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'text-canvas-muted-deep hover:text-violet-400 hover:bg-violet-500/10 border-transparent hover:border-violet-500/20'}`} title="AI & Machine Learning">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>

              {/* Security */}
              <button onClick={() => togglePanel('security-scan')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'security-scan' ? 'bg-primary-500/20 text-primary-400 border-primary-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-canvas-muted-deep hover:text-primary-400 hover:bg-primary-500/10 border-transparent hover:border-primary-500/20'}`} title="Security">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>

              {/* Analytics */}
              <button onClick={() => togglePanel('analytics')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'analytics' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'text-canvas-muted-deep hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'}`} title="Analytics">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>

              {/* API Tools */}
              <button onClick={() => togglePanel('api-tools')} className={`p-2.5 rounded-lg transition-all w-full flex justify-center border ${activePanel === 'api-tools' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-canvas-muted-deep hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`} title="API Tools">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Dark/Light Mode */}
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl text-canvas-muted hover:text-white hover:bg-white/5 transition-all w-full flex justify-center" title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Scroll indicator - shows during highlight animation */}
            {sidebarHighlight && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )}
          </div>

          {/* Fixed Status at Bottom */}
          <div className={`py-3 border-t ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'} w-full flex justify-center`}>
            <div className={`w-2 h-2 rounded-full ${genState.isGenerating ? 'bg-yellow-500 animate-pulse' : genState.isThinking ? 'bg-cyan-500 animate-pulse' : 'bg-emerald-500'} shadow-sm shadow-emerald-500/50`}></div>
          </div>
        </nav>

        {/* 2. Main Content Area - Neural Style */}
        <div className={`flex-1 flex flex-col relative overflow-hidden ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-50'}`}>
          {/* Workspace Content (Preview/Code) - Full Height */}
          <main className="flex-1 relative flex overflow-hidden min-h-0">
            <div className={`flex-1 relative overflow-hidden ${isDarkMode ? 'bg-black/20 border-gray-800/50' : 'bg-gray-100 border-gray-200'} m-2 rounded-lg border shadow-[0_0_40px_rgba(0,0,0,0.3)]`}>
              {genState.isGenerating && (
                <div className={`absolute inset-0 z-40 ${isDarkMode ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-md flex flex-col items-center justify-center overflow-hidden`}>
                  {/* Animated background particles */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-1 bg-cyan-500/30 rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                          animationDelay: `${Math.random() * 2}s`
                        }}
                      />
                    ))}
                  </div>

                  {/* Fun animated loader */}
                  <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-purple-500/20 rounded-full"></div>
                    <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-cyan-400 border-r-purple-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 w-20 h-20 border-4 border-transparent border-b-pink-500 border-l-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-4 w-16 h-16 border-2 border-transparent border-t-yellow-400 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl animate-bounce" style={{ animationDuration: '0.8s' }}>{FUN_LOADING_MESSAGES[funMessageIndex].emoji}</span>
                    </div>
                  </div>

                  <div className="text-center max-w-lg px-6">
                    {/* Category badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-full">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">AI Building Your App</span>
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></span>
                    </div>

                    {/* Main model message */}
                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-4 animate-pulse">
                      {genState.progressMessage}
                    </p>

                    {/* Fun rotating message with speech bubble effect */}
                    <div className="relative bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl p-4 border border-gray-700/50 shadow-lg">
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-800/50 rotate-45 border-l border-t border-gray-700/50"></div>
                      <p className="text-base text-canvas-text leading-relaxed transition-all duration-500 ease-in-out">
                        {FUN_LOADING_MESSAGES[funMessageIndex].text}
                      </p>
                    </div>

                    {/* Animated progress bar */}
                    <div className="mt-6 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full"
                        style={{
                          animation: 'progressPulse 2s ease-in-out infinite',
                          width: '60%'
                        }}
                      />
                    </div>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-3 mt-4">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                          style={{
                            animation: 'bounce 1s ease-in-out infinite',
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Tip with icon */}
                    <div className={`flex items-center justify-center gap-2 text-xs ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} mt-6`}>
                      <span className="text-yellow-500">💡</span>
                      <span>Pro tip: You can refine your app with follow-up messages after it's built!</span>
                    </div>
                  </div>

                  {/* CSS for custom animations */}
                  <style>{`
                  @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                    50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
                  }
                  @keyframes progressPulse {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(50%); }
                    100% { transform: translateX(100%); }
                  }
                `}</style>
                </div>
              )}
              {/* Device Frame Preview OR Full-Width Panel */}
              {activePanel && FULL_WIDTH_PANELS.has(activePanel) ? (
                <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card' : 'bg-white'}`}>
                  {/* Full-Width Panel Header */}
                  <div className={`flex items-center justify-between px-6 py-3 border-b ${isDarkMode ? 'border-canvas-border' : 'border-gray-200'} shrink-0`}>
                    <h2 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      {activePanel === 'dashboard' && '📊 Dashboard'}
                      {activePanel === 'history' && '🕒 History'}
                      {activePanel === 'hub' && '🏛️ Studio Hub'}
                      {activePanel === 'agent' && '🤖 AI Agent'}
                      {activePanel === 'database' && '🗄️ Database'}
                      {activePanel === 'dependencies' && '📦 Dependencies'}
                      {activePanel === 'env-vars' && '🔑 Environment Variables'}
                      {activePanel === 'image-to-code' && '🖼️ Image to Code'}
                      {activePanel === 'video' && '🎬 Video Editor'}
                      {activePanel === 'analytics' && '📊 Analytics'}
                      {activePanel === 'billing' && '💳 Billing & Usage'}
                      {activePanel === 'build' && '🔨 Build Pipeline'}
                      {activePanel === 'search-replace' && '🔍 Search & Replace'}
                      {activePanel === 'deploy-dashboard' && '🚀 Deploy Dashboard'}
                      {activePanel === 'version-history' && '📜 Version History'}
                      {activePanel === 'editor-settings' && '⚙️ Editor Settings'}
                      {activePanel === 'monitoring' && '📡 Monitoring'}
                      {activePanel === 'image-gen' && '🎨 Image Generation'}
                      {activePanel === 'file-parse' && '📄 File Parse'}
                      {activePanel === 'security-scan' && '🛡️ Security Scanner'}
                      {activePanel === 'data-tools' && '📊 Data Tools'}
                      {activePanel === 'web-tools' && '🌐 Web & Frontend Tools'}
                      {activePanel === 'ai-ml' && '🤖 AI & Machine Learning'}
                      {activePanel === 'api-tools' && '🔌 API Tools'}
                      {activePanel === 'git' && '📦 Git'}
                      {activePanel === 'ai-tools' && '⚡ AI Tools'}
                      {activePanel === 'assets' && '🖼️ Assets'}
                      {activePanel === 'templates' && '📋 Templates'}
                      {activePanel === 'collaboration' && '👥 Collaboration'}
                      {activePanel === 'projects' && '📂 Projects'}
                      {activePanel === 'drafts' && '📂 Projects'}
                      {activePanel === 'knowledge-graph' && '🧠 Knowledge Graph'}
                      {activePanel === 'archive' && '📦 Archive'}
                      {activePanel === 'workspace' && '🛠️ Workspace'}
                    </h2>
                    <button onClick={() => setActivePanel(null)} className={`${isDarkMode ? 'text-canvas-muted-deep hover:text-white' : 'text-canvas-muted hover:text-gray-600'} transition-colors p-1`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {/* Full-Width Panel Content */}
                  <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {activePanel === 'database' && (
                      <DatabasePanel projectId={currentApp?.id || 'default'} className="min-h-[400px]" />
                    )}
                    {activePanel === 'dependencies' && (
                      <div className="min-h-[400px] p-6">
                        {(() => {
                          const files = editorBridge.toProjectFiles();
                          const pkgFile = files.find((f: { path: string }) => f.path.endsWith('package.json'));
                          if (!pkgFile) return <div className="flex items-center justify-center min-h-[300px] text-canvas-muted-deep text-sm">No package.json found in project</div>;
                          try {
                            const pkg = JSON.parse(pkgFile.content || '{}');
                            const deps = Object.entries(pkg.dependencies || {}) as [string, string][];
                            const devDeps = Object.entries(pkg.devDependencies || {}) as [string, string][];
                            return (
                              <div className="space-y-4">
                                {deps.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-bold text-canvas-muted uppercase tracking-wider mb-2">Dependencies ({deps.length})</h4>
                                    <div className="space-y-1">{deps.map(([name, ver]) => <div key={name} className="flex justify-between text-xs px-2 py-1.5 rounded bg-white/5"><span className="text-canvas-text">{name}</span><span className="text-canvas-muted-deep">{ver as string}</span></div>)}</div>
                                  </div>
                                )}
                                {devDeps.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-bold text-canvas-muted uppercase tracking-wider mb-2">Dev Dependencies ({devDeps.length})</h4>
                                    <div className="space-y-1">{devDeps.map(([name, ver]) => <div key={name} className="flex justify-between text-xs px-2 py-1.5 rounded bg-white/5"><span className="text-canvas-text">{name}</span><span className="text-canvas-muted-deep">{ver as string}</span></div>)}</div>
                                  </div>
                                )}
                                {deps.length === 0 && devDeps.length === 0 && <div className="text-canvas-muted-deep text-sm text-center py-8">No dependencies listed</div>}
                              </div>
                            );
                          } catch { return <div className="text-canvas-muted-deep text-sm text-center py-8">Could not parse package.json</div>; }
                        })()}
                      </div>
                    )}
                    {activePanel === 'env-vars' && (
                      <EnvironmentVars
                        variables={envVariables}
                        onChange={setEnvVariables}
                        className="min-h-[400px] p-6"
                      />
                    )}
                    {activePanel === 'image-to-code' && (
                      <ImageToCode
                        onGenerate={(code) => {
                          editorBridge.createFile('/generated-from-image.html', code);
                          setProjectFiles(editorBridge.getProjectTree());
                          openFileInTab('/generated-from-image.html');
                          setCurrentApp(prev => prev ? { ...prev, code } : { id: Date.now().toString(), name: 'Image to Code', code, prompt: 'Generated from image', timestamp: Date.now(), history: [] });
                          setActivePanel(null);
                        }}
                        onClose={() => setActivePanel(null)}
                      />
                    )}
                    {activePanel === 'video' && (
                      <VideoEditorPanel userId={authUser?.id} />
                    )}
                    {activePanel === 'analytics' && (
                      <AnalyticsPanel
                        isDarkMode={isDarkMode}
                        chatMessages={currentApp?.history?.map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp }))}
                        sessionStartTime={sessionStartRef.current}
                      />
                    )}

                    {activePanel === 'billing' && (() => {
                      // Load real usage + invoices from backend
                      if (!billingDataRef.current) {
                        billingDataRef.current = { loading: true };
                        Promise.all([
                          fetch('/api/canvas/studio-usage', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
                          fetch('/api/canvas/studio-invoices', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
                        ]).then(([usage, inv]) => {
                          billingDataRef.current = {
                            metrics: usage?.metrics || [
                              { label: 'AI Generations', used: currentApp?.history?.filter(m => m.role === 'model').length || 0, limit: 500, unit: 'requests', icon: 'generations' },
                              { label: 'Tokens Used', used: Math.round((currentApp?.history?.filter(m => m.role === 'model') || []).reduce((sum, m) => sum + (m.text?.length || 0) * 1.3, 0)), limit: 250000, unit: 'tokens', icon: 'tokens' },
                            ],
                            invoices: inv?.invoices || [],
                            plan: usage?.plan || activePlan?.type || 'free',
                          };
                          setActivePanel(null); setTimeout(() => setActivePanel('billing'), 0);
                        });
                      }
                      const bd = billingDataRef.current;
                      return (
                        <div className="p-6 space-y-6">
                          <UsageDashboard
                            metrics={bd.metrics || [
                              { label: 'AI Generations', used: 0, limit: 500, unit: 'requests', icon: 'generations' },
                              { label: 'Tokens Used', used: 0, limit: 250000, unit: 'tokens', icon: 'tokens' },
                            ]}
                            plan={bd.plan || activePlan?.type || 'free'}
                            onUpgrade={() => window.open('https://sanbayfusion.com/overview/studio/', '_blank')}
                          />
                          <InvoiceHistory
                            invoices={bd.invoices || []}
                            onDownload={(id) => window.open('https://sanbayfusion.com/dashboard/billing', '_blank')}
                            onViewDetails={(id) => window.open('https://sanbayfusion.com/dashboard/billing', '_blank')}
                          />
                        </div>
                      );
                    })()}
                    {activePanel === 'build' && (
                      <BuildPanel
                        projectId={currentApp?.id || 'default'}
                        onDeployReady={(buildId) => { setShowDeployPanel(true); setActivePanel(null); }}
                        className="min-h-[400px]"
                      />
                    )}
                    {activePanel === 'search-replace' && (
                      <div className="p-6">
                        <SearchReplace
                          onSearch={(query, flags) => {
                            const files = editorBridge.toProjectFiles();
                            const regex = new RegExp(query, (flags?.caseSensitive ? '' : 'i') + (flags?.regex ? '' : ''));
                            let matchCount = 0;
                            for (const f of files) {
                              const lines = (f.content || '').split('\n');
                              for (let i = 0; i < lines.length; i++) {
                                if (regex.test(lines[i])) matchCount++;
                              }
                            }
                            toast.info('Search', `Found ${matchCount} match${matchCount !== 1 ? 'es' : ''} for "${query}"`);
                          }}
                          onReplace={(search, replace) => {
                            if (activeFilePath) {
                              const content = editorBridge.toProjectFiles().find((f: { path: string }) => f.path === activeFilePath)?.content || '';
                              const newContent = content.replace(new RegExp(search, 'g'), replace);
                              editorBridge.updateFile(activeFilePath, newContent);
                              setCurrentApp(prev => prev ? { ...prev, code: editorBridge.toHtml() } : null);
                            }
                          }}
                          onReplaceAll={(search, replace) => {
                            editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => {
                              const newContent = f.content.replace(new RegExp(search, 'g'), replace);
                              editorBridge.updateFile(f.path, newContent);
                            });
                            setCurrentApp(prev => prev ? { ...prev, code: editorBridge.toHtml() } : null);
                          }}
                          onNavigateResult={(file, line) => openFileInTab(file)}
                          className="min-h-[300px]"
                        />
                      </div>
                    )}
                    {activePanel === 'deploy-dashboard' && (() => {
                      if (deployHistory.length === 0) {
                        fetch('/api/canvas/deploy/history', { credentials: 'include' })
                          .then(r => r.ok ? r.json() : null)
                          .then(d => { if (d?.history?.length) setDeployHistory(d.history); })
                          .catch(() => { });
                      }
                      // Fetch domains
                      if (!hostingDataRef.current) {
                        hostingDataRef.current = { domains: [], hostingStats: null, loading: true };
                        Promise.all([
                          fetch('/api/canvas/deploy/domains', { credentials: 'include' }).then(r => r.ok ? r.json() : { domains: [] }).catch(() => ({ domains: [] })),
                          fetch('/api/canvas/deploy/hosting-stats', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
                        ]).then(([domainsRes, statsRes]) => {
                          hostingDataRef.current = { domains: domainsRes.domains || [], hostingStats: statsRes, loading: false };
                          setActivePanel('deploy-dashboard'); // trigger re-render
                        });
                      }
                      const domains = hostingDataRef.current?.domains || [];
                      const hostingStats = hostingDataRef.current?.hostingStats;
                      const steps = deployHistory.slice(0, 5).map((d: any) => ({
                        name: `${d.platform || 'Deploy'}: ${d.projectName || 'project'}`,
                        status: d.status === 'success' ? 'success' as const : d.status === 'error' ? 'error' as const : 'pending' as const,
                        duration: d.createdAt ? new Date(d.createdAt).toLocaleString() : undefined,
                      }));
                      const versions = deployHistory.map((d: any) => ({
                        id: d.id,
                        version: d.id?.slice(0, 8) || 'v1',
                        deployedAt: d.createdAt,
                        platform: d.platform,
                        status: d.status,
                        url: d.url,
                        isCurrent: false,
                      }));
                      if (versions.length > 0) versions[0].isCurrent = true;
                      const formattedStats = hostingStats ? {
                        totalRequests: { label: 'Total Deploys', value: String(hostingStats.totalDeploys || 0), sparkline: hostingStats.sparkline || [] },
                        bandwidth: { label: 'Bandwidth', value: '—' },
                        avgResponseTime: { label: 'Avg Latency', value: hostingStats.avgLatency ? `${hostingStats.avgLatency}ms` : '—', sparkline: hostingStats.sparkline || [] },
                        uniqueVisitors: { label: 'Visitors', value: '—' },
                        uptimePercent: { label: 'Uptime', value: hostingStats.uptime ? `${hostingStats.uptime}%` : '—' },
                        errorRate: { label: 'Error Rate', value: hostingStats.errorRate ? `${hostingStats.errorRate}%` : '0%' },
                      } : undefined;
                      return (
                        <div className="p-6 space-y-6">
                          <DeployStatus steps={steps} className="min-h-[200px]" />
                          <DomainManager
                            domains={domains.map((d: any) => ({ id: d.id, domain: d.domain, status: d.status || 'active', isPrimary: d.isPrimary || false }))}
                            onAdd={async (domain) => {
                              try {
                                const res = await fetch('/api/canvas/deploy/domains', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, projectId: currentApp?.id }) });
                                if (res.ok) { hostingDataRef.current = null; toast.success('Domains', `Domain "${domain}" added.`); }
                                else { const e = await res.json().catch(() => ({})); toast.error('Domains', e.error || 'Failed to add domain.'); }
                              } catch { toast.error('Domains', 'Network error adding domain.'); }
                            }}
                            onRemove={async (id) => {
                              try {
                                const res = await fetch(`/api/canvas/deploy/domains/${id}`, { method: 'DELETE', credentials: 'include' });
                                if (res.ok) { hostingDataRef.current = null; toast.success('Domains', 'Domain removed.'); }
                                else toast.error('Domains', 'Failed to remove domain.');
                              } catch { toast.error('Domains', 'Network error.'); }
                            }}
                            onSetPrimary={(id) => toast.info('Domains', 'Primary domain updated.')}
                            onRefreshDNS={(id) => toast.info('Domains', 'DNS check initiated.')}
                          />
                          <RollbackPanel
                            versions={versions}
                            onRollback={async (versionId) => {
                              try {
                                const res = await fetch(`/api/canvas/deploy/rollback/${versionId}`, { method: 'POST', credentials: 'include' });
                                if (res.ok) { toast.success('Rollback', `Rolled back to version ${versionId?.slice(0, 8)}.`); setDeployHistory([]); hostingDataRef.current = null; }
                                else { const e = await res.json().catch(() => ({})); toast.error('Rollback', e.error || 'Rollback failed.'); }
                              } catch { toast.error('Rollback', 'Network error during rollback.'); }
                            }}
                          />
                          {formattedStats && <HostingDashboard stats={formattedStats} lastDeployedAt={deployHistory[0]?.createdAt} />}
                        </div>);
                    })()}
                    {activePanel === 'version-history' && (
                      <HistoryPanel
                        entries={gitCommits.map(c => ({ id: c.id, timestamp: c.date, description: c.message, author: c.author, type: 'commit' as const }))}
                        onRestore={(entry) => toast.info('Restore', `Restoring to "${entry.description || entry.id}" — use git checkout in terminal.`)}
                        onPreview={(entry) => toast.info('Preview', `Preview for "${entry.description || entry.id}" — use git diff in terminal.`)}
                        onBookmark={(id) => toast.info('Bookmark', 'Version bookmarked.')}
                        className="min-h-[400px]"
                      />
                    )}
                    {activePanel === 'editor-settings' && (
                      <EditorSettingsPanel
                        isOpen={true}
                        onClose={() => setActivePanel(null)}
                      />
                    )}
                    {activePanel === 'monitoring' && (
                      <MonitoringDashboard projectId={currentApp?.id || 'default'} className="min-h-[400px]" />
                    )}
                    {activePanel === 'image-gen' && (
                      <ImageGenPanel onGenerated={(url, prompt) => {
                        const fileName = `/assets/generated-${Date.now()}.png`;
                        const imgTag = `<!-- Generated: ${(prompt || '').slice(0, 50)} -->\n<img src="${url}" alt="${(prompt || '').replace(/"/g, '&quot;')}" style="max-width:100%" />\n`;
                        editorBridge.createFile(fileName, imgTag);
                        setProjectFiles(editorBridge.getProjectTree());
                        toast.success('Image Added', `Generated image saved to ${fileName}`);
                      }} />
                    )}
                    {activePanel === 'file-parse' && (
                      <FileParsePanel />
                    )}
                    {activePanel === 'security-scan' && (
                      <SecurityScanPanel />
                    )}
                    {activePanel === 'data-tools' && (
                      <DataToolsPanel />
                    )}
                    {activePanel === 'web-tools' && (
                      <WebFrontendToolsPanel
                        currentCode={currentApp?.code || ''}
                        onApplyChanges={(code) => {
                          setCurrentApp(prev => prev ? { ...prev, code } : null);
                          editorBridge.loadFromHtml(code);
                          setProjectFiles(editorBridge.getProjectTree());
                        }}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    {activePanel === 'ai-ml' && (
                      <AIMLPanel
                        currentCode={currentApp?.code || ''}
                        onApplyCode={(code) => {
                          setCurrentApp(prev => prev ? { ...prev, code } : null);
                          editorBridge.loadFromHtml(code);
                          setProjectFiles(editorBridge.getProjectTree());
                        }}
                        isDarkMode={isDarkMode}
                      />
                    )}
                    {activePanel === 'api-tools' && (
                      <APIToolsPanel isDarkMode={isDarkMode} />
                    )}
                    {activePanel === 'dashboard' && (
                      <DashboardPanel isDarkMode={isDarkMode} onNavigate={(panel) => togglePanel(panel as ActivePanel)} />
                    )}
                    {activePanel === 'hub' && (
                      <StudioHub
                        isDarkMode={isDarkMode}
                        onClose={() => setActivePanel(null)}
                        onSendMessage={(msg: string) => { handleMessage(msg); setActivePanel('assistant'); }}
                      />
                    )}
                    {activePanel === 'agent' && (
                      <AgentPanel
                        projectId={currentApp?.id || ''}
                        isDarkMode={isDarkMode}
                        className="h-full"
                      />
                    )}
                    {activePanel === 'git' && (
                      <GitPanel
                        projectId={currentApp?.id || ''}
                        isDarkMode={isDarkMode}
                        onFilesRestored={() => setProjectFiles(editorBridge.getProjectTree())}
                        className="h-full"
                      />
                    )}
                    {activePanel === 'ai-tools' && (
                      <AIToolsPanel
                        projectId={currentApp?.id || ''}
                        isDarkMode={isDarkMode}
                        onFileUpdated={() => setProjectFiles(editorBridge.getProjectTree())}
                        className="h-full"
                      />
                    )}
                    {activePanel === 'assets' && (
                      <AssetsPanel
                        projectId={currentApp?.id || ''}
                        isDarkMode={isDarkMode}
                        onInsertUrl={(url) => {
                          if (activeFilePath) {
                            const content = editorBridge.getFile(activeFilePath) || '';
                            editorBridge.updateFile(activeFilePath, content + '\n<img src="' + url + '" alt="asset" />');
                            setProjectFiles(editorBridge.getProjectTree());
                          }
                        }}
                        className="h-full"
                      />
                    )}
                    {activePanel === 'templates' && (
                      <TemplatesPanel
                        isDarkMode={isDarkMode}
                        onUseTemplate={(prompt) => { handleMessage(prompt); setActivePanel('assistant'); }}
                        className="h-full"
                      />
                    )}
                    {activePanel === 'collaboration' && (
                      <CollaborationPanel
                        projectId={currentApp?.id || 'default'}
                        projectName={currentApp?.name}
                        isDarkMode={isDarkMode}
                        className="h-full"
                      />
                    )}
                    {(activePanel === 'projects' || activePanel === 'drafts') && (
                      <ProjectsPanel
                        currentAppId={currentApp?.id}
                        isDarkMode={isDarkMode}
                        className="h-full"
                        onSelectProject={(projectId) => {
                          fetch(`/api/canvas-projects/${projectId}`, { credentials: 'include' })
                            .then(r => r.json())
                            .then(project => {
                              if (project) {
                                setCurrentApp({ id: project.id, name: project.name, code: project.code || '', prompt: project.description || '', timestamp: Date.now(), history: [] });
                                if (project.code) {
                                  editorBridge.loadFromHtml(project.code);
                                  setProjectFiles(editorBridge.getProjectTree());
                                }
                              }
                            })
                            .catch(() => {});
                          setActivePanel(null);
                        }}
                        onLoadDraft={(draft) => {
                          setCurrentApp(prev => prev ? { ...prev, code: draft.code, name: draft.name } : { id: draft.id, name: draft.name, code: draft.code, prompt: draft.prompt, timestamp: Date.now(), history: [] });
                          editorBridge.loadFromHtml(draft.code);
                          setProjectFiles(editorBridge.getProjectTree());
                          setActivePanel(null);
                        }}
                        onNewDraft={() => {
                          setCurrentApp(null);
                          editorBridge.loadFromHtml('');
                          setProjectFiles(editorBridge.getProjectTree());
                          setActivePanel(null);
                        }}
                        onNewProject={(name) => {
                          fetch('/api/canvas-projects', {
                            method: 'POST', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, description: '', language: 'html' }),
                          }).catch(() => {});
                        }}
                      />
                    )}
                    {activePanel === 'knowledge-graph' && (
                      <KnowledgeGraphPanel
                        currentCode={currentApp?.code || ''}
                        projectFiles={editorBridge.toProjectFiles().map((f: { path: string; content: string }) => ({ path: f.path, content: f.content }))}
                        isDarkMode={isDarkMode}
                        className="h-full"
                      />
                    )}
                    {activePanel === 'archive' && (
                      <ArchivePanel
                        onRestore={(project) => {
                          setCurrentApp({ id: project.id, name: project.name, code: project.code, prompt: project.prompt, timestamp: Date.now(), history: [] });
                          editorBridge.loadFromHtml(project.code);
                          setProjectFiles(editorBridge.getProjectTree());
                          setActivePanel(null);
                        }}
                        isDarkMode={isDarkMode}
                        className="h-full"
                      />
                    )}
                    {activePanel === 'workspace' && (
                      <WorkspacePanel
                        isDarkMode={isDarkMode}
                        className="h-full"
                        prompt={prompt}
                        setPrompt={setPrompt}
                        isGenerating={genState.isGenerating || genState.isThinking}
                        activePlan={activePlan}
                        currentApp={currentApp ? { id: currentApp.id, name: currentApp.name, code: currentApp.code, prompt: currentApp.prompt, timestamp: currentApp.timestamp, language: currentApp.language, provider: currentApp.provider, modelId: currentApp.modelId } : null}
                        history={history.map(h => ({ id: h.id, name: h.name, code: h.code, prompt: h.prompt, timestamp: h.timestamp, language: h.language, provider: h.provider, modelId: h.modelId }))}
                        quickActions={QUICK_ACTIONS}
                        templates={STUDIO_TEMPLATES.map(t => ({ name: t.name, icon: t.icon, category: t.category, description: t.description, prompt: t.prompt, tags: t.tags }))}
                        templateCategories={TEMPLATE_CATEGORIES}
                        onStartBuilding={() => requireAuth(() => { handleMessage(prompt); setPrompt(''); setActivePanel('assistant'); })}
                        onQuickAction={(actionId) => {
                          const actionPrompts: Record<string, string> = {
                            'dark-mode': 'Add a dark mode toggle to this app with smooth transitions',
                            'responsive': 'Make this layout fully responsive for mobile, tablet and desktop',
                            'animations': 'Add smooth CSS animations and transitions throughout the app',
                            'accessibility': 'Improve accessibility with ARIA labels, focus states, and keyboard navigation',
                            'loading': 'Add loading states and skeleton screens to improve UX',
                            'validation': 'Add form validation with error messages and success states',
                          };
                          requireAuth(() => { handleMessage(actionPrompts[actionId] || actionId); setActivePanel('assistant'); });
                        }}
                        onSelectTemplate={(tplPrompt) => requireAuth(() => { handleMessage(tplPrompt); setActivePanel('assistant'); })}
                        onViewAllTemplates={() => requireAuth(() => { setTemplateCategory('all'); setActivePanel('templates'); })}
                        onOpenProject={(project) => {
                          const app = history.find(h => h.id === project.id);
                          if (app) {
                            setCurrentApp(app);
                            if (app.code) editorBridge.loadFromHtml(app.code);
                            setProjectFiles(editorBridge.getProjectTree());
                            setActivePanel(null);
                          }
                        }}
                        onShowPurchaseModal={() => setShowPurchaseModal(true)}
                        onNewProject={() => {
                          if (currentApp && (currentApp.code || currentApp.history.length > 0)) {
                            saveApp(currentApp, !history.some(h => h.id === currentApp.id));
                          }
                          setCurrentApp({ id: Date.now().toString(), name: 'New Project', code: '', prompt: '', timestamp: Date.now(), history: [] });
                          setActivePanel(null);
                        }}
                      />
                    )}
                    {activePanel === 'history' && (
                      <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-50'}`}>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                          {history.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {history.map((app) => (
                                <button
                                  key={app.id}
                                  onClick={() => { setCurrentApp(app); setActivePanel(null); }}
                                  className={`text-left rounded-xl border transition-all duration-200 overflow-hidden group ${
                                    currentApp?.id === app.id
                                      ? isDarkMode
                                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                                        : 'bg-cyan-50 border-cyan-400/50 shadow-md'
                                      : isDarkMode
                                        ? 'bg-canvas-card border-gray-800/60 hover:border-cyan-500/30 hover:bg-canvas-card'
                                        : 'bg-white border-gray-200 hover:border-cyan-300 hover:shadow-md'
                                  }`}
                                >
                                  {/* Card Header */}
                                  <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-800/40' : 'border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className={`text-sm font-bold truncate ${currentApp?.id === app.id ? 'text-cyan-400' : isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {app.name}
                                      </h4>
                                      {currentApp?.id === app.id && (
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 uppercase tracking-wider shrink-0 ml-2">Active</span>
                                      )}
                                    </div>
                                    <div className={`text-[10px] font-mono ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>
                                      {new Date(app.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                      {' \u00B7 '}
                                      {new Date(app.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                  {/* Card Body */}
                                  <div className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
                                        <span>💬</span>
                                        <span>{app.history?.length || 0} messages</span>
                                      </div>
                                      <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>
                                        <span>{app.code ? '📄' : '💭'}</span>
                                        <span>{app.code ? 'Has code' : 'Chat only'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-24">
                              <div className="text-4xl mb-4 opacity-30">🕒</div>
                              <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No project history yet</p>
                              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'}`}>Start chatting to create your first project</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Device Frame Preview */
                <div className="h-full flex items-center justify-center p-4">
                  <div
                    className={`${isDarkMode ? 'bg-canvas-card border-gray-800/50' : 'bg-white border-gray-200'} rounded-lg shadow-2xl overflow-hidden transition-all duration-300 border ${deviceMode === 'desktop' ? 'w-full h-full' : ''}`}
                    style={deviceMode !== 'desktop' ? { width: DEVICE_SIZES[deviceMode].width, height: DEVICE_SIZES[deviceMode].height } : {}}
                  >
                    {viewMode === ViewMode.PREVIEW ? (
                      <ErrorBoundary name="Preview">
                        <div className="h-full flex flex-col">
                          {/* Preview Toolbar */}
                          <PreviewToolbar
                            device={deviceMode}
                            onDeviceChange={(d) => setDeviceMode(d)}
                            url={previewUrl || currentApp?.name || 'preview'}
                            onRefresh={() => setCurrentApp(prev => prev ? { ...prev, code: prev.code + ' ' } : null)}
                            onOpenExternal={previewUrl ? () => window.open(previewUrl, '_blank', 'noopener') : undefined}
                            showConsole={showConsolePanel}
                            onToggleConsole={() => setShowConsolePanel(!showConsolePanel)}
                            showNetwork={showNetworkPanel}
                            onToggleNetwork={() => setShowNetworkPanel(!showNetworkPanel)}
                            zoom={previewZoom}
                            onZoomChange={setPreviewZoom}
                            isLoading={genState.isGenerating || genState.isThinking}
                          />
                          <div className="flex-1 min-h-0" style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left', width: `${100 / previewZoom}%`, height: `${100 / previewZoom}%` }}>
                            <Preview
                              code={currentApp?.code || ''}
                              isBuilding={genState.isGenerating || genState.isThinking}
                              buildMessage={genState.progressMessage || (genState.isThinking ? 'Nova is thinking...' : 'Building your app...')}
                              onOpenEditor={handleOpenEditor}
                              onOpenSandbox={handleOpenSandbox}
                              isDarkMode={isDarkMode}
                              previewUrl={previewUrl}
                            />
                          </div>
                          {/* Console & Network Panels */}
                          {(showConsolePanel || showNetworkPanel) && (
                            <div className="h-48 border-t border-gray-800/50 flex flex-col shrink-0">
                              <div className="flex gap-1 px-2 py-1 bg-canvas-card border-b border-gray-800/30">
                                <button onClick={() => { setShowConsolePanel(true); setShowNetworkPanel(false); }} className={`px-3 py-1 text-[10px] rounded ${showConsolePanel ? 'bg-cyan-500/20 text-cyan-400' : 'text-canvas-muted-deep hover:text-canvas-text'}`}>Console</button>
                                <button onClick={() => { setShowNetworkPanel(true); setShowConsolePanel(false); }} className={`px-3 py-1 text-[10px] rounded ${showNetworkPanel ? 'bg-cyan-500/20 text-cyan-400' : 'text-canvas-muted-deep hover:text-canvas-text'}`}>Network</button>
                              </div>
                              <div className="flex-1 min-h-0 overflow-auto">
                                {showConsolePanel && <ConsolePanel entries={consoleEntries} onClear={() => setConsoleEntries([])} />}
                                {showNetworkPanel && <NetworkPanel requests={networkRequests} onClear={() => setNetworkRequests([])} />}
                              </div>
                            </div>
                          )}
                        </div>
                      </ErrorBoundary>
                    ) : viewMode === ViewMode.CODE ? (
                      <div className="h-full flex flex-col">
                        {/* Tab Bar */}
                        <TabBar
                          openFiles={openTabs}
                          activeFile={activeFilePath || '/index.html'}
                          onSelectFile={(path) => setActiveFilePath(path)}
                          onCloseFile={closeTab}
                          darkMode={isDarkMode}
                        />
                        {/* Monaco Editor + Terminal */}
                        <div className={`flex-1 overflow-hidden flex flex-col ${showTerminal ? '' : ''}`}>
                          <div className={showTerminal ? 'flex-1 min-h-0' : 'h-full'}>
                            <MonacoEditorComponent
                              filePath={activeFilePath || '/index.html'}
                              darkMode={isDarkMode}
                              onSave={(content) => {
                                if (activeFilePath) {
                                  editorBridge.updateFile(activeFilePath, content);
                                  const newHtml = editorBridge.toHtml();
                                  setCurrentApp(prev => prev ? { ...prev, code: newHtml } : null);
                                }
                              }}
                              onChange={(content) => {
                                if (activeFilePath) {
                                  editorBridge.updateFile(activeFilePath, content);
                                }
                              }}
                            />
                          </div>
                          {/* Editor Status Bar */}
                          <EditorStatusBar
                            language={activeFilePath?.split('.').pop() || 'html'}
                            gitBranch={gitBranch}
                            isConnected={true}
                            isSaving={false}
                          />
                          {showTerminal && (
                            <div style={{ height: '200px' }}>
                              <TerminalComponent
                                isDark={isDarkMode}
                                isVisible={showTerminal}
                                onClose={() => setShowTerminal(false)}
                                currentFiles={(() => {
                                  const files: Record<string, string> = {};
                                  editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => { files[f.path] = f.content; });
                                  return files;
                                })()}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full">
                        <div className={`w-1/2 border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                          <Preview
                            code={currentApp?.code || ''}
                            isBuilding={genState.isGenerating || genState.isThinking}
                            buildMessage={genState.progressMessage || (genState.isThinking ? 'Nova is thinking...' : 'Building your app...')}
                            onOpenEditor={handleOpenEditor}
                            onOpenSandbox={handleOpenSandbox}
                            isDarkMode={isDarkMode}
                            previewUrl={previewUrl}
                          />
                        </div>
                        <div className="w-1/2 flex flex-col">
                          {/* Tab Bar in split mode */}
                          <TabBar
                            openFiles={openTabs}
                            activeFile={activeFilePath || '/index.html'}
                            onSelectFile={(path) => setActiveFilePath(path)}
                            onCloseFile={closeTab}
                            darkMode={isDarkMode}
                          />
                          <div className={`flex-1 overflow-hidden flex flex-col`}>
                            <div className={showTerminal ? 'flex-1 min-h-0' : 'h-full'}>
                              <MonacoEditorComponent
                                filePath={activeFilePath || '/index.html'}
                                darkMode={isDarkMode}
                                onSave={(content) => {
                                  if (activeFilePath) {
                                    editorBridge.updateFile(activeFilePath, content);
                                    const newHtml = editorBridge.toHtml();
                                    setCurrentApp(prev => prev ? { ...prev, code: newHtml } : null);
                                  }
                                }}
                                onChange={(content) => {
                                  if (activeFilePath) {
                                    editorBridge.updateFile(activeFilePath, content);
                                  }
                                }}
                              />
                            </div>
                            {showTerminal && (
                              <div style={{ height: '180px' }}>
                                <TerminalComponent
                                  isDark={isDarkMode}
                                  isVisible={showTerminal}
                                  onClose={() => setShowTerminal(false)}
                                  currentFiles={(() => {
                                    const files: Record<string, string> = {};
                                    editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => { files[f.path] = f.content; });
                                    return files;
                                  })()}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Right Toggleable Panels (Drawer-style) - Neural Style */}
            <div
              className={`h-full min-h-0 ${isDarkMode ? 'bg-canvas-card/95 border-gray-800/50' : 'bg-white border-gray-200'} backdrop-blur-md border-l transition-all duration-300 ease-in-out flex shrink-0 shadow-2xl overflow-hidden ${activePanel && !FULL_WIDTH_PANELS.has(activePanel) ? 'w-80' : 'w-0 border-l-0 opacity-0'
                }`}
            >
              <div className="w-80 h-full min-h-0 flex flex-col">
                {/* Workspace Panel — moved to full-screen panels */}

                {activePanel === 'assistant' && (
                  <div className={`h-full min-h-0 flex flex-col ${isDarkMode ? 'bg-canvas-card/95' : 'bg-white'}`}>
                    <div className="px-6 py-4 flex items-center justify-between">
                      <h3 className={`text-xs font-bold ${isDarkMode ? 'text-cyan-500/80' : 'text-cyan-600'} uppercase tracking-widest`}>
                        AI Assistant
                      </h3>
                      <button
                        onClick={() => setActivePanel(null)}
                        className="text-gray-600 hover:text-cyan-400 transition-colors"
                        title="Close"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                      {/* Voice Input modal — shown only when user clicks the mic button */}
                      {showVoiceInput && (
                        <VoiceInput
                          onTranscript={(text) => { handleMessage(text); setShowVoiceInput(false); }}
                          onClose={() => setShowVoiceInput(false)}
                          isProcessing={genState.isGenerating || genState.isThinking}
                          placeholder="Tap to speak..."
                        />
                      )}
                      <ErrorBoundary name="Chat">
                        <ChatBox
                          messages={currentApp?.history || []}
                          onSendMessage={(text, fileData, mode) => handleMessage(text, fileData, mode)}
                          onVoiceClick={() => setShowVoiceInput(true)}
                          isGenerating={genState.isGenerating || genState.isThinking || false}
                          onCancel={handleCancelGeneration}
                          isDarkMode={isDarkMode}
                          chatSessions={history}
                          onLoadSession={(app) => {
                            // Save current app before switching
                            if (currentApp && currentApp.history.length > 0) {
                              const existsInHistory = history.some(h => h.id === currentApp.id);
                              saveApp(currentApp, !existsInHistory);
                            }
                            setCurrentApp(app);
                            if (app.code) {
                              setViewMode(ViewMode.PREVIEW);
                            }
                          }}
                          onNewChat={() => {
                            // Save current app to history first if it exists and has code or messages
                            if (currentApp && (currentApp.code || currentApp.history.length > 0)) {
                              // Make sure app is in history with latest state
                              const appToSave = {
                                ...currentApp,
                                name: currentApp.name || currentApp.prompt?.substring(0, 30) + '...' || 'Untitled App',
                              };
                              // Check if already in history
                              const existsInHistory = history.some(h => h.id === currentApp.id);
                              if (existsInHistory) {
                                // Update existing
                                saveApp(appToSave, false);
                              } else {
                                // Add as new to history
                                saveApp(appToSave, true);
                              }
                              // Add to local history state immediately for UI update
                              setHistory(prev => {
                                const filtered = prev.filter(h => h.id !== appToSave.id);
                                return [appToSave, ...filtered].slice(0, 20);
                              });
                            }
                            // Clear current app to start fresh
                            setCurrentApp(null);
                            setPrompt('');
                            setViewMode(ViewMode.PREVIEW);
                            // Keep the assistant panel open for new conversation
                            // Don't switch to workspace - user is ready to chat!
                          }}
                        />
                      </ErrorBoundary>
                    </div>
                  </div>
                )}

                {/* History panel moved to full-width panels */}

                {/* Files Panel - Using FileTree component */}
                {activePanel === 'files' && (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <FileTree
                      files={projectFiles}
                      activeFile={activeFilePath}
                      onFileSelect={(path) => {
                        openFileInTab(path);
                      }}
                      onFileCreate={(path) => {
                        editorBridge.createFile(path, '');
                        setProjectFiles(editorBridge.getProjectTree());
                        openFileInTab(path);
                      }}
                      onFileDelete={(path) => {
                        editorBridge.deleteFile(path);
                        setProjectFiles(editorBridge.getProjectTree());
                        // Also close the tab
                        setOpenTabs(prev => prev.filter(p => p !== path));
                        if (activeFilePath === path) {
                          setActiveFilePath('/index.html');
                        }
                      }}
                      onFileRename={(oldPath, newPath) => {
                        editorBridge.renameFile(oldPath, newPath);
                        setProjectFiles(editorBridge.getProjectTree());
                        // Update tab
                        setOpenTabs(prev => prev.map(p => p === oldPath ? newPath : p));
                        if (activeFilePath === oldPath) {
                          setActiveFilePath(newPath);
                        }
                      }}
                      darkMode={isDarkMode}
                    />
                  </div>
                )}

                {/* Tools Panel */}
                {activePanel === 'tools' && (
                  <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card/95' : 'bg-white'}`}>
                    {/* Fixed Header */}
                    <div className="px-6 py-4 flex items-center justify-between">
                      <h3 className={`text-sm font-bold ${isDarkMode ? 'text-cyan-500/80' : 'text-cyan-600'} uppercase tracking-widest`}>
                        Tools & Actions
                      </h3>
                      <button onClick={() => setActivePanel(null)} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-scroll px-6 pb-6 space-y-6" style={{ maxHeight: 'calc(100vh - 60px)' }}>
                      {/* Quick Enhancements */}
                      <div>
                        <h4 className="text-[10px] font-bold text-canvas-muted-deep uppercase tracking-widest mb-3">
                          Quick Enhancements
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {QUICK_ACTIONS.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => {
                                const actionPrompts: Record<string, string> = {
                                  'dark-mode': 'Add a dark mode toggle to this app with smooth transitions',
                                  'responsive': 'Make this layout fully responsive for mobile, tablet and desktop',
                                  'animations': 'Add smooth CSS animations and transitions throughout the app',
                                  'accessibility': 'Improve accessibility with ARIA labels, focus states, and keyboard navigation',
                                  'loading': 'Add loading states and skeleton screens to improve UX',
                                  'validation': 'Add form validation with error messages and success states'
                                };
                                handleMessage(actionPrompts[action.id] || action.description);
                                setActivePanel('assistant');
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-black/30 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all text-left group"
                            >
                              <span className="text-sm">{action.icon}</span>
                              <span className="text-[10px] font-medium text-canvas-muted-deep group-hover:text-cyan-400 truncate transition-colors">{action.label}...</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feature Hub */}
                      <div>
                        <h4 className="text-[10px] font-bold text-canvas-muted-deep uppercase tracking-widest mb-3">
                          Feature Hub
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'database' as const, icon: '🗄️', label: 'Database' },
                            { id: 'dependencies' as const, icon: '📦', label: 'Packages' },
                            { id: 'env-vars' as const, icon: '🔑', label: 'Env Vars' },
                            { id: 'image-to-code' as const, icon: '🖼️', label: 'Img → Code' },
                            { id: 'video' as const, icon: '🎬', label: 'Video Editor' },
                            { id: 'analytics' as const, icon: '📊', label: 'Analytics' },
                            { id: 'billing' as const, icon: '💳', label: 'Billing' },
                            { id: 'build' as const, icon: '🔨', label: 'Build' },
                            { id: 'search-replace' as const, icon: '🔍', label: 'Find/Replace' },
                            { id: 'deploy-dashboard' as const, icon: '🚀', label: 'Deploy Hub' },
                            { id: 'version-history' as const, icon: '📜', label: 'Versions' },
                            { id: 'editor-settings' as const, icon: '⚙️', label: 'Editor' },
                            { id: 'monitoring' as const, icon: '📡', label: 'Monitoring' },
                            { id: 'image-gen' as const, icon: '🎨', label: 'Image Gen' },
                            { id: 'file-parse' as const, icon: '📄', label: 'File Parse' },
                            { id: 'security-scan' as const, icon: '🛡️', label: 'Security' },
                            { id: 'data-tools' as const, icon: '📊', label: 'Data Tools' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              onClick={() => togglePanel(item.id)}
                              className="flex items-center gap-2 px-3 py-2.5 bg-black/30 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all text-left group"
                            >
                              <span className="text-sm">{item.icon}</span>
                              <span className="text-[10px] font-medium text-canvas-muted-deep group-hover:text-cyan-400 truncate transition-colors">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Settings Panel - Now just for additional settings */}
                {activePanel === 'settings' && (
                  <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDarkMode ? 'bg-canvas-card/95' : 'bg-white'}`}>
                    {/* Fixed Header */}
                    <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'} flex items-center justify-between shrink-0`}>
                      <h3 className={`text-sm font-bold ${isDarkMode ? 'text-cyan-500/80' : 'text-cyan-600'} uppercase tracking-widest`}>
                        Settings
                      </h3>
                      <button onClick={() => setActivePanel(null)} className="text-gray-600 hover:text-cyan-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                      {/* Neural Mode Toggle */}
                      <div className="p-4 bg-black/30 border border-gray-800 rounded-lg">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="text-xs font-bold text-canvas-text uppercase tracking-wider">Neural Mode</p>
                            <p className="text-[10px] text-canvas-muted-deep">Cyberpunk interface active</p>
                          </div>
                          <div className="w-10 h-5 rounded-full transition-colors bg-cyan-600 shadow-[0_0_10px_rgba(34,211,238,0.3)]" onClick={() => setIsDarkMode(!isDarkMode)}>
                            <div className="w-4 h-4 rounded-full bg-white mt-0.5 transition-transform translate-x-5"></div>
                          </div>
                        </label>
                      </div>
                      {/* Auto-sync */}
                      <div className="p-4 bg-black/30 border border-gray-800 rounded-lg">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="text-xs font-bold text-canvas-text uppercase tracking-wider">Auto-sync</p>
                            <p className="text-[10px] text-canvas-muted-deep">Automatically save changes</p>
                          </div>
                          <div className="w-10 h-5 rounded-full bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-colors">
                            <div className="w-4 h-4 rounded-full bg-white mt-0.5 translate-x-5"></div>
                          </div>
                        </label>
                      </div>
                      {/* Export Options */}
                      <div className="p-4 bg-black/30 border border-gray-800 rounded-lg">
                        <p className="text-xs font-bold text-canvas-text mb-3 uppercase tracking-wider">Export Options</p>
                        <div className="space-y-2">
                          <button onClick={handleDownloadZip} className="w-full py-2 text-xs font-bold bg-black/40 hover:bg-cyan-500/10 text-canvas-muted hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-wider">
                            Download as HTML
                          </button>
                          <button onClick={handleOpenSandbox} className="w-full py-2 text-xs font-bold bg-black/40 hover:bg-cyan-500/10 text-canvas-muted hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-wider">
                            Export to CodeSandbox
                          </button>
                          <button onClick={handlePushToGitHub} className="w-full py-2 text-xs font-bold bg-black/40 hover:bg-cyan-500/10 text-canvas-muted hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all uppercase tracking-wider">
                            Push to GitHub
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Templates Panel — moved to full-screen panels */}

                {/* Studio Hub moved to full-width panels */}

                {/* Agent Panel moved to full-width panels */}

                {/* Git Panel moved to full-width panels */}


                {/* Assets — moved to full-screen panels */}

                {/* AI Tools — moved to full-screen panels */}

                {/* Drafts Panel — moved to full-screen panels */}

                {/* Projects Panel — moved to full-screen panels */}

                {/* Collaboration Panel — moved to full-screen panels */}

                {/* Workflow Automation Panel */}
                {activePanel === 'workflow' && (
                  <div className={`h-full min-h-0 flex flex-col ${isDarkMode ? 'bg-canvas-card/95' : 'bg-white'}`}>
                    <div className="px-6 py-4 flex items-center justify-between shrink-0">
                      <h3 className={`text-xs font-bold ${isDarkMode ? 'text-fuchsia-500/80' : 'text-fuchsia-600'} uppercase tracking-widest`}>Workflow Automation</h3>
                      <button onClick={() => setActivePanel(null)} className="text-gray-600 hover:text-fuchsia-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <WorkflowAutomationPanel
                        projectId={currentApp?.id || 'default'}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </div>
                )}

                {/* Knowledge Graph Panel — moved to full-screen panels */}

                {/* Archive Panel — moved to full-screen panels */}


              </div>
            </div>
          </main>
        </div>
      </div>

      {genState.error && (
        <div className={`fixed bottom-6 right-6 z-[100] max-w-sm p-4 ${isDarkMode ? 'bg-canvas-card border-primary-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-white border-primary-300 shadow-lg'} border rounded-lg flex gap-4 items-start animate-slide-up`}>
          <div className="p-2 bg-primary-500/20 text-primary-400 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-primary-400 uppercase tracking-wider">
              System Error
            </h4>
            <p className="text-xs text-canvas-muted mt-1 leading-relaxed">
              {genState.error}
            </p>
            <div className="mt-3 flex gap-4">
              <button
                onClick={() => setGenState({ ...genState, error: null })}
                className="text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-wider"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Camera Modal - Selfie Style */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
          {/* Camera View */}
          <div className="relative w-full h-full flex flex-col">
            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <button
                onClick={stopCamera}
                className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-800 hover:border-cyan-500/30 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-xs font-bold bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-cyan-500/30 uppercase tracking-wider">
                  {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
                </span>
              </div>
              <button
                onClick={switchCamera}
                className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-800 hover:border-cyan-500/30 transition-all"
                title="Switch Camera"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Video Preview */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`max-w-full max-h-full object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
              {capturedImage ? (
                <>
                  {/* Retake Button */}
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="px-6 py-3 bg-black/50 backdrop-blur-sm rounded-full text-cyan-400 font-bold hover:bg-cyan-500/20 border border-gray-800 hover:border-cyan-500/30 transition-all uppercase tracking-wider"
                  >
                    Retake
                  </button>
                  {/* Save Button */}
                  <button
                    onClick={savePhoto}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-full text-white font-bold hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all uppercase tracking-wider"
                  >
                    Save Photo
                  </button>
                </>
              ) : (
                /* Capture Button */
                <button
                  onClick={takePhoto}
                  className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                >
                  <div className="w-16 h-16 bg-black rounded-full border-4 border-cyan-400"></div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Navigation Drawer */}
      <CanvasNavDrawer
        isOpen={showNavDrawer}
        onClose={() => setShowNavDrawer(false)}
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
        chatHistory={currentApp?.history?.map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp })) || []}
      />

      {/* Deploy Panel Overlay */}
      {showDeployPanel && currentApp?.code && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeployPanel(false)}></div>
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg">
            <DeployPanel
              darkMode={isDarkMode}
              projectName={currentApp.name || 'my-app'}
              files={(() => {
                const fileMap: Record<string, string> = {};
                const tree = editorBridge.getProjectTree();
                const extractFiles = (nodes: typeof tree) => {
                  for (const node of nodes) {
                    if (node.type === 'file' && node.content) {
                      fileMap[node.path] = node.content;
                    } else if (node.children) {
                      extractFiles(node.children);
                    }
                  }
                };
                extractFiles(tree);
                if (Object.keys(fileMap).length === 0 && currentApp.code) {
                  fileMap['index.html'] = currentApp.code;
                }
                return fileMap;
              })()}
              onClose={() => setShowDeployPanel(false)}
              onDeployComplete={(url) => {
                console.log('[Deploy] Success:', url);
              }}
              onFixBuildError={(error, logs) => {
                console.log('[Deploy] Build error:', error, logs);
                setShowDeployPanel(false);
                handleMessage(`Fix this build error for deployment: ${error}\n\nBuild logs:\n${logs.join('\n')}`);
              }}
            />
          </div>
        </div>
      )}

      {/* Small Login Modal — shown when user tries to chat without being logged in */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}>
          <div className="bg-canvas-card border border-canvas-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-white font-bold text-lg">Sign In Required</h3>
              </div>
              <button onClick={() => setShowLoginModal(false)} className="text-canvas-muted-deep hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-canvas-muted text-sm mb-5">Sign in to start building apps with Canvas Studio. It's free to create an account!</p>
            <div className="flex flex-col gap-2.5">
              <a href="https://sanbayfusion.com/auth/login?redirect=https%3A%2F%2Fstudio.sanbayfusion.com" className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-cyan-700 hover:to-cyan-600 transition-all text-center text-sm">Log In</a>
              <a href="https://sanbayfusion.com/auth/signup?redirect=https%3A%2F%2Fstudio.sanbayfusion.com" className="w-full py-2.5 px-4 bg-white/5 border border-canvas-border text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-center text-sm">Create Free Account</a>
            </div>
          </div>
        </div>
      )}

      {/* Plan Required Modal — shown when logged in but no active plan */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)}>
          <div className="bg-canvas-card border border-canvas-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h3 className="text-white font-bold text-lg">Active Plan Required</h3>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="text-canvas-muted-deep hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-canvas-muted text-sm mb-5">A subscription is required to use Canvas Studio features. Choose a plan to get started.</p>
            <a
              href="https://sanbayfusion.com/overview/studio/"
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-cyan-400 transition-all text-sm text-center block shadow-lg shadow-cyan-900/20"
            >
              View Pricing
            </a>
          </div>
        </div>
      )}

      {/* Thank You Toast — shows after successful Stripe checkout */}
      {showThankYou && (
        <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-canvas-card border border-cyan-500/30 rounded-2xl p-5 shadow-2xl shadow-cyan-500/10 max-w-sm">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1">Welcome to Canvas Studio Pro!</h3>
                <p className="text-canvas-muted text-xs leading-relaxed">Your plan is now active. Start building amazing apps with AI!</p>
              </div>
            </div>
            <div className="mt-3 w-full bg-white/5 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full animate-[shrink_6s_linear_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Neural Link Footer */}
      <footer className={`h-8 shrink-0 ${isDarkMode ? 'bg-canvas-card/95 border-gray-800/50' : 'bg-white/95 border-gray-200'} backdrop-blur-sm border-t flex items-center justify-between px-4 z-10`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} uppercase tracking-widest`}>Canvas_Protocol_v2.0</span>
        </div>
        {/* Center — Plan Badge */}
        <div className="flex items-center">
          {activePlan && (
            <PlanStatusBar plan={{
              type: activePlan.type === 'yearly' ? 'lifetime' : activePlan.type,
              price: activePlan.price,
              startDate: activePlan.startDate,
              expiryDate: activePlan.expiryDate,
              isLifetime: activePlan.type === 'yearly',
              daysRemaining: activePlan.daysRemaining,
              hoursRemaining: activePlan.hoursRemaining,
            }} />
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[10px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'} uppercase tracking-widest`}>Neural_Sync_Active</span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </footer>

      {/* ── Global Toast System ── */}
      <ToastContainer />

      {/* ── Pending Approval Banner ── */}
      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-4"
            style={{
              background: isDarkMode ? 'rgba(15,15,20,0.95)' : 'rgba(255,255,255,0.97)',
              borderColor: isDarkMode ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.2)',
            }}
          >
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="text-sm font-semibold text-cyan-400">Approval Requested</span>
              <span className={`text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-gray-600'}`}>
                {pendingApproval.action}: {pendingApproval.description}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { toast.success('Approved', pendingApproval.action); setPendingApproval(null); }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => { toast.warning('Denied', pendingApproval.action); setPendingApproval(null); }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-canvas-text transition-colors"
              >
                Deny
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pending Question Card ── */}
      <AnimatePresence>
        {pendingQuestion && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex flex-col gap-3 max-w-md"
            style={{
              background: isDarkMode ? 'rgba(15,15,20,0.95)' : 'rgba(255,255,255,0.97)',
              borderColor: isDarkMode ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.2)',
            }}
          >
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {pendingQuestion.question}
            </span>
            {pendingQuestion.options.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pendingQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { toast.info('Answer', opt); setPendingQuestion(null); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-600/30 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setPendingQuestion(null)}
                className="self-end px-4 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                OK
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Plan Status Bar moved into footer center ── */}
    </div>
  );
};

export default App;
