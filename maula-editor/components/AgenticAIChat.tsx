import { createLogger } from '../services/logger';
const log = createLogger('AgenticAIChat');
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store/useStore';
import { ChatMessage, SSEEvent, ToolEvent } from '../types';
import { voiceInput, voiceOutput, speechSupport } from '../services/speech';
import { aiAgentExtension, FileOperation } from '../services/aiAgentExtension';
import { extensionEvents } from '../services/extensions';
import { filesApiService } from '../services/filesApi';
import { socketService } from '../services/socket';
import { StreamingParser, StreamingFileOperation, StreamingCommand } from '../services/streamingParser';
import { webContainerService } from '../services/webcontainer';
import { useEditorBridge } from '../services/useEditorBridge';
import AIAgentExtensionSettings from './AIAgentExtensionSettings';
import { fetchWithCredentials } from '../fetchUtil';

// ── 130+ Tool Icon Mappings (matches all 366 backend tools) ──
const toolIcons: Record<string, string> = {
  // File management
  write_file: '📝', read_file: '📖', delete_file: '🗑️', list_files: '📁',
  create_file: '📄', modify_file: '✏️', rename_file: '🏷️', move_file: '📦',
  copy_file: '📋', open_file: '📂', list_folders: '📂', get_project_tree: '🌳',
  find_file_by_name: '🔎', file_search: '🔍', list_directory: '📁',
  file_watch: '👁️', sync_files: '🔄', file_hash: '#️⃣', file_diff: '↔️', file_permissions: '🔐',
  bulk_file_operations: '📦', bulk_upload_handler: '📤', change_file_extension: '🏷️',
  // Search & navigation
  search_in_files: '🔍', run_command: '⚡', get_symbols: '🔣', get_references: '🔗', rename_symbol: '🏷️',
  // Deploy & web
  deploy_project: '🚀', deploy_static: '🚀', sdk_generate: '🛠️',
  web_search: '🌐', fetch_url: '📡', fetch_webpage: '📡', http_request: '📡',
  web_scrape: '🕷️', web_screenshot: '📸', web_analyze: '📊', web_scaffold: '🏗️',
  web_optimize: '⚡', web_transform: '🔄', web_lighthouse: '💡',
  // Core utility
  execute_code: '▶️', calculate: '🧮', get_current_time: '🕐', get_weather: '🌤️',
  generate_video: '🎬', generate_image: '🖼️', generate_speech: '🔊',
  // Image tools
  image_ai: '🤖', image_analyze: '🔬', image_background: '🎨', image_batch: '📦',
  image_compose: '🎭', image_convert: '💱', image_create: '🖼️', image_export: '📤',
  image_face: '👤', image_filter: '🎨', image_merge: '🔀', image_ocr: '📝',
  image_optimize: '⚡', image_transform: '🔄',
  // Video tools
  video_transform: '🔄', video_convert: '💱', video_analyze: '📊', video_filter: '🎨',
  video_ai: '🤖', video_overlay: '📐', video_audio: '🔊', video_batch: '📦',
  video_trim: '✂️', video_highlights: '⭐', video_resize: '📐', video_subtitles: '💬',
  video_style: '🎭', video_faces: '👤', video_moderate: '🛡️', video_export: '📤',
  transcribe_audio: '🎙️',
  // Archive tools
  archive_create: '📦', archive_extract: '📤', archive_inspect: '🔍', archive_search: '🔎',
  archive_core: '📦', archive_edit: '✏️', archive_structure: '🏗️', archive_security: '🔒',
  archive_bulk: '📥', archive_convert: '🔀', archive_intelligence: '🧠', archive_deploy: '🚀',
  create_zip: '📦', extract_zip: '📤', create_tar: '📦', extract_tar: '📤',
  zip_files: '🗜️', unzip_files: '📦',
  // Code intelligence
  code_edit: '✏️', code_navigate: '🧭', code_symbols: '🔣', code_git: '📊',
  code_deps: '📦', code_lint: '🧹', code_test: '🧪', code_refactor: '♻️',
  code_metrics: '📏', code_debug: '🐛', code_docs: '📖', code_scaffold: '🏗️',
  debug_code: '🐛', format_code: '✨', lint_code: '🧹', run_script: '▶️', summarize_file: '📋',
  // Git
  git_status: '📊', git_commit: '💾', git_push: '📤', git_pull: '📥',
  git_branch: '🌿', git_diff: '↔️', git_log: '📜', git_stash: '📦', git_checkout: '🔀',
  // Editor
  editor_select: '🖍️', editor_cursor: '📍', editor_selection: '🖍️',
  editor_insert: '📥', editor_context: '🧩',
  // Backend
  backend_ratelimit: '⏱️', backend_test: '🧪', backend_upload: '📤',
  backend_webhook: '🔗', error_middleware: '🛡️',
  // Database
  db_query: '🗄️', db_schema: '📐', db_migrate: '🔄', db_analyze: '📊',
  db_backup: '💾', db_connect: '🔌',
  // API
  api_request: '📡', api_mock: '🎭', api_document: '📄', api_test: '🧪',
  api_transform: '🔄', api_monitor: '📈', api_rate_limit: '⏱️', api_auth: '🔐',
  // LLM & ML
  llm_chat: '💬', llm_embed: '🧠', llm_finetune: '🎯', llm_prompt: '✍️',
  ml_train: '🏋️', ml_predict: '🔮', ml_data_prep: '🧪', ml_pipeline: '⚙️',
  // Security
  crypto_hash: '#️⃣', crypto_encrypt: '🔒', crypto_sign: '✋', crypto_random: '🎲',
  scan_secrets: '🕵️', scan_malware: '🛡️', security_headers: '🧱', cert_tools: '📃',
  scan_vulnerabilities: '🛡️', policy_enforce: '📜', threat_model: '🎯', incident_response: '🚨',
  sec_pen_test: '🗡️', sec_compliance_check: '✅', sec_auth_audit: '🔑', sec_network_scan: '🌐',
  sec_dependency_audit: '📦', sec_waf_rules: '🧱', sec_forensics: '🔬', sec_crypto_audit: '🔐',
  sec_container_scan: '🐳', sec_api_security: '🔌', sec_siem: '📊', sec_zero_trust: '🚫',
  sec_devsecops: '⚙️', sec_data_protection: '🛡️', sec_access_review: '👁️',
  log_parse: '📋', file_compress: '🗜️',
  // Advanced AI
  llm_compare: '⚖️', llm_cache: '📦', llm_cost_optimize: '💰', llm_evaluate: '📊',
  llm_guardrail: '🛡️', llm_router: '🔀', prompt_template: '📜',
  agent_chain: '🔗', agent_delegate: '📋', agent_reflect: '🪞', agent_spawn: '🚀',
  model_benchmark: '🏆',
  // Data science
  correlation_matrix: '🔢', hypothesis_test: '🧪', outlier_detect: '🎯',
  time_series: '📈', data_sample: '🎲', data_clean: '🧹', data_profile: '📊',
  data_visualize: '📉', feature_engineer: '🔧', model_compare: '⚖️',
  // Geo/Location
  geo_geocode: '📍', geo_route: '🗺️', geo_distance: '📏', geo_fence: '🏗️',
  geo_timezone: '🕐', geo_elevation: '⛰️', geo_place: '🏙️', geo_midpoint: '⊕',
  geo_convert: '🔄', geo_heatmap: '🌡️',
  // Cloud control
  cloud_deploy: '🚀', cloud_scale: '📈', cloud_logs: '📜', cloud_secrets: '🔐',
  cloud_cost: '💰', cloud_monitor: '📟', cloud_backup: '💾', cloud_network: '🌐',
  cloud_iam: '👤', cloud_registry: '📦', cloud_queue: '📨', cloud_cdn: '⚡',
  // DevOps
  docker_build: '🐳', docker_run: '🐳', docker_compose: '🐳',
  ci_pipeline: '🔄', cloud_dns: '🌐', cloud_ssl: '🔒', cloud_storage: '☁️',
  dev_docker: '🐳', dev_npm: '📦', dev_debug: '🐛', dev_filesystem: '📂',
  dev_git: '📊', dev_intelligence: '🧠', dev_search: '🔍', dev_test: '🧪',
  // Collaboration
  comment_thread: '💬', conflict_resolve: '🤝', live_session: '🟢',
  notification_send: '🔔', presence_track: '🟢', review_comment: '💬',
  role_assign: '👤', share_snapshot: '📸', team_invite: '👥',
  // Communication
  email_send: '📧', notification_push: '🔔', sms_send: '📱',
  // Workflow
  plan_workflow: '📋', workflow_create: '🔧', workflow_execute: '▶️',
  workflow_run: '▶️', workflow_schedule: '📅', workflow_template: '📝',
  workflow_webhook: '🔗', workflow_variables: '🔧', workflow_audit: '📜',
  workflow_rollback: '⏪', workflow_optimize: '⚡', workflow_visualize: '🗺️',
  // Knowledge Graph
  kg_create: '🧠', kg_query: '🔍', kg_reason: '🤔', kg_visualize: '🗺️',
  kg_export: '📤', kg_embed: '🧠', kg_cluster: '🎯', kg_history: '📅',
  kg_merge: '🔀',
  // Analytics & Business
  campaign_generate: '📣', competitor_track: '🏁', customer_segment: '👥',
  growth_analyze: '📈', lead_enrich: '💎', nps_survey: '⭐', pricing_simulate: '💰',
  revenue_forecast: '📈', metrics_aggregate: '📈',
  // Markdown
  markdown_convert: '📝', markdown_extract: '🔍', markdown_format: '✨',
  markdown_generate: '📝', markdown_merge: '📏', markdown_template: '📄',
  markdown_toc: '📑', markdown_transform: '♻️', markdown_validate: '✅',
  // Task management
  cron_schedule: '⏰', event_trigger: '⚡', retry_policy: '🔄',
  task_assign: '📋', task_queue: '📨',
  // Testing
  test_coverage_report: '📊', test_e2e: '🧪', test_load: '🏋️',
  test_mock_server: '🎭', test_snapshot: '📸',
  // Monitoring
  monitor_health: '💚', monitor_logs: '📜', monitor_performance: '⚡',
  // Parsing
  parse_csv: '📊', parse_docx: '📄', parse_html: '🌐',
  parse_json: '📋', parse_markdown: '📝', parse_pdf: '📕',
  // Data processing
  data_diff: '↔️', data_merge: '🔀', data_pipeline: '⚙️',
  data_transform: '🔄', data_validate: '✅',
  // Webhook
  webhook_dispatch: '📤', webhook_listen: '🔔', telemetry_send: '📡',
  // Context & Memory
  save_context: '💾', recall_context: '🧠', list_context_keys: '🔑',
  // JSON tools
  read_json: '📋', write_json: '📝',
  // Other
  diff_merge: '↔️', shared_snippet: '📋', think_step_by_step: '🤔',
  replace_range: '✏️', update_file: '✏️', agent_plan: '📋', agent_context: '🧩',
  activity_log: '📝', access_request: '🔐',
};

// Helper to get icon for any tool event
const getToolEventIcon = (te: ToolEvent): string => {
  if (te.type === 'agent_event') {
    const agentIcons: Record<string, string> = {
      manager: '🧠', codeBuild: '🏗️', deepThink: '🔮', imageGen: '🎨',
      research: '🔍', fastCode: '⚡', analysis: '📊',
    };
    return agentIcons[(te as any).agent || ''] || '🤖';
  }
  if (te.type === 'worker_text') return '🤖';
  if (te.type === 'file_write') return '📝';
  if (te.type === 'file_delete') return '🗑️';
  if (te.type === 'command_output') return '⚡';
  if (te.type === 'image_result') return '🖼️';
  if (te.type === 'video_result') return '🎬';
  if (te.type === 'archive_result') return '📦';
  if (te.type === 'backend_result') return '🏗️';
  if (te.type === 'code_result') return toolIcons[(te as any).tool || ''] || '💻';
  if (te.type === 'editor_command') return '📍';
  if (te.type === 'agent_memory' || (te as any).type === 'agent_memory_result') return '🧠';
  if (te.type === 'agent_approval' || (te as any).type === 'agent_approval_request') return '🛡️';
  if ((te as any).type === 'agent_ui' || (te as any).type === 'agent_ui_message' || (te as any).type === 'agent_ui_question' || (te as any).type === 'agent_ui_progress') return '💬';
  if (te.tool) return toolIcons[te.tool] || '🔧';
  return '⚡';
};

// Helper to get label for any tool event
const getToolEventLabel = (te: ToolEvent): string => {
  if (te.type === 'agent_event') {
    const agentLabels: Record<string, string> = {
      manager: 'Team Manager', codeBuild: 'Code Architect', deepThink: 'Deep Thinker',
      imageGen: 'Visual Designer', research: 'Research Analyst', fastCode: 'Quick Builder',
      analysis: 'Code Reviewer',
    };
    const label = agentLabels[(te as any).agent || ''] || (te as any).agentName || (te as any).agent;
    return `${label} — ${(te as any).event || te.summary || ''}`;
  }
  if (te.type === 'worker_text') {
    const workerLabels: Record<string, string> = {
      codeBuild: 'Code Architect', deepThink: 'Deep Thinker', imageGen: 'Visual Designer',
      research: 'Research Analyst', fastCode: 'Quick Builder', analysis: 'Code Reviewer',
    };
    return workerLabels[(te as any).agent || ''] || (te as any).agentName || (te as any).agent || 'Worker';
  }
  if (te.type === 'tool_start') return te.tool?.replace(/_/g, ' ') || 'tool';
  if (te.type === 'tool_result') return `${te.tool?.replace(/_/g, ' ')} → ${te.summary || (te.success ? 'ok' : 'failed')}`;
  if (te.type === 'file_write') return `wrote ${te.path}`;
  if (te.type === 'file_delete') return `deleted ${te.path}`;
  if (te.type === 'command_output') return te.content?.slice(0, 60) || 'command';
  if (te.type === 'image_result') return te.summary || 'Image generated';
  if (te.type === 'video_result') return te.summary || 'Video generated';
  if (te.type === 'archive_result') return te.summary || 'Archive operation';
  if (te.type === 'backend_result') return te.summary || 'Backend operation';
  if (te.type === 'code_result') return te.summary || 'Code operation';
  if (te.type === 'editor_command') return te.summary || 'Editor command';
  return te.summary || te.type;
};

// Icons
const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Message action icons
const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ThumbsUpIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-3.5 h-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
  </svg>
);

const ThumbsDownIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-3.5 h-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface AgenticAIChatProps {
  voiceEnabled?: boolean;
  onFileOperation?: (operation: FileOperation) => void;
  onTerminalCommand?: (command: string) => void;
}

export const AgenticAIChat: React.FC<AgenticAIChatProps> = ({
  voiceEnabled: externalVoiceEnabled = false,
  onFileOperation,
  onTerminalCommand,
}) => {
  const {
    chatHistory,
    addMessage,
    clearChat,
    isAiLoading,
    setAiLoading,
    openFiles,
    activeFileId,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    files,
    openFile,
    updateFileContent,
    currentProject,
    createProject,
    setCurrentProject,
    // Chat sessions
    chatSessions,
    activeChatSessionId,
    createChatSession,
    deleteChatSession,
    switchChatSession,
    renameChatSession,
  } = useStore();

  // Editor Bridge for cursor/selection control
  const editorBridge = useEditorBridge();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [currentStreamingFile, setCurrentStreamingFile] = useState<StreamingFileOperation | null>(null);
  const [createdFilesCount, setCreatedFilesCount] = useState(0);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string, content: string, type: string, isImage?: boolean }>>([]);
  const [webContainerStatus, setWebContainerStatus] = useState<'idle' | 'booting' | 'installing' | 'running' | 'error'>('idle');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('orchestrator');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [agentStatus, setAgentStatus] = useState<{ status: string; agent: string; message?: string } | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down' | null>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showExtensionSettings, setShowExtensionSettings] = useState(false);
  const [aiAgentStatus, setAiAgentStatus] = useState(aiAgentExtension.getStatus());
  const [extensionConfig, setExtensionConfig] = useState(aiAgentExtension.getConfig());
  const [liveToolEvents, setLiveToolEvents] = useState<ToolEvent[]>([]);

  // Handle file operation from AI
  const handleFileOperation = useCallback((operation: FileOperation) => {
    log.info('[AI] File operation:', operation);

    if (onFileOperation) {
      onFileOperation(operation);
    } else {
      // Default handler - create/edit files in store
      if (operation.type === 'create' || operation.type === 'edit') {
        const pathParts = operation.path.split('/');
        const fileName = pathParts.pop() || operation.path;
        const parentPath = pathParts.length > 0 ? pathParts.join('/') : '';

        // Create parent folders if they don't exist
        if (parentPath) {
          const folderParts = parentPath.split('/');
          let currentPath = '';
          for (const folder of folderParts) {
            const folderPath = currentPath ? `${currentPath}/${folder}` : folder;
            // Check if folder exists in files
            const folderExists = files.some(f => f.path === folderPath && f.type === 'folder');
            if (!folderExists) {
              createFolder(currentPath, folder);
            }
            currentPath = folderPath;
          }
        }

        // Determine language from extension
        const ext = fileName.split('.').pop() || '';
        const languageMap: Record<string, string> = {
          'ts': 'typescript',
          'tsx': 'typescript',
          'js': 'javascript',
          'jsx': 'javascript',
          'py': 'python',
          'html': 'html',
          'css': 'css',
          'json': 'json',
          'md': 'markdown',
          'yml': 'yaml',
          'yaml': 'yaml',
          'sh': 'bash',
          'env': 'plaintext',
        };
        const language = languageMap[ext] || 'plaintext';

        // Create the file
        createFile(parentPath, fileName, operation.content);

        // Auto-open the file in editor
        const fileId = crypto.randomUUID();
        openFile({
          id: fileId,
          name: fileName,
          path: operation.path,
          content: operation.content || '',
          language,
          isDirty: false,
        });

        log.info(`[AI] Created/Updated file: ${operation.path}`);
      } else if (operation.type === 'delete') {
        // Handle delete operation using store
        deleteNode(operation.path);
        log.info(`[AI] Deleted file/folder: ${operation.path}`);
      } else if (operation.type === 'rename') {
        // Handle rename operation using store
        if (operation.newName) {
          renameNode(operation.path, operation.newName);
          log.info(`[AI] Renamed ${operation.path} to ${operation.newName}`);
        } else {
          log.warn('[AI] Rename operation missing newName');
        }
      }
    }
  }, [onFileOperation, createFile, createFolder, deleteNode, renameNode, openFile, files]);

  // Listen for extension events
  useEffect(() => {
    const unsubscribeStatus = aiAgentExtension.onStatusChange(setAiAgentStatus);
    const unsubscribeConfig = aiAgentExtension.onConfigChange(setExtensionConfig);

    // Listen for open settings command from extension
    const handleOpenSettings = () => setShowExtensionSettings(true);
    extensionEvents.on('aiAgent:openSettings', handleOpenSettings);

    return () => {
      unsubscribeStatus();
      unsubscribeConfig();
      extensionEvents.off('aiAgent:openSettings', handleOpenSettings);
    };
  }, []);

  // Available agents
  const AGENTS = [
    { id: 'orchestrator', name: 'Orchestrator', icon: '🎯', description: 'Auto-delegates to best agent' },
    { id: 'code-generation', name: 'Code Gen', icon: '💻', description: 'Creates new code' },
    { id: 'refactor', name: 'Refactor', icon: '🔧', description: 'Improves code' },
    { id: 'debug', name: 'Debug', icon: '🐛', description: 'Finds bugs' },
    { id: 'test', name: 'Test', icon: '🧪', description: 'Writes tests' },
    { id: 'build', name: 'Build', icon: '📦', description: 'Build config' },
    { id: 'deploy', name: 'Deploy', icon: '🚀', description: 'Deployment' },
    { id: 'filesystem', name: 'Files', icon: '📁', description: 'File ops' },
    { id: 'ui', name: 'UI', icon: '🎨', description: 'UI components' },
    { id: 'documentation', name: 'Docs', icon: '📝', description: 'Documentation' },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const parserRef = useRef<StreamingParser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = openFiles.find(f => f.id === activeFileId);

  // Theme classes — overlay is ALWAYS white/light, independent of editor theme
  const isDark = false;
  const bgClass = 'bg-white';
  const borderClass = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textClass = isDark ? 'text-vscode-text' : 'text-gray-800';
  const mutedTextClass = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const inputBgClass = isDark ? 'bg-vscode-input border-vscode-border' : 'bg-white border-gray-300';

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, streamingContent]);

  // Connect to socket on mount
  useEffect(() => {
    const connect = async () => {
      setConnectionStatus('connecting');
      try {
        await socketService.connect();
        setConnectionStatus('connected');
      } catch (err) {
        log.error('Socket connection failed:', err);
        setConnectionStatus('disconnected');
      }
    };

    connect();
  }, []);

  // Helper to get language from file extension
  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
      'py': 'python', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown',
    };
    return map[ext] || 'plaintext';
  };

  // Track created file paths to avoid duplicates
  const createdFilePaths = useRef<Set<string>>(new Set());
  const MAX_FILES_PER_SESSION = 25; // Limit files to prevent runaway creation

  // Create file immediately when streaming starts
  const handleFileStart = useCallback((file: StreamingFileOperation) => {
    // Check if we've hit the file limit
    if (createdFilePaths.current.size >= MAX_FILES_PER_SESSION) {
      log.warn('[AI] ⚠️ File limit reached, skipping:', file.path);
      return;
    }

    // Check if file was already created in this session
    if (createdFilePaths.current.has(file.path)) {
      log.info('[AI] ⏭️ File already created, skipping:', file.path);
      return;
    }

    log.info('[AI] 📄 File started:', file.path);
    createdFilePaths.current.add(file.path);
    setCurrentStreamingFile(file);

    // Create folders if needed
    const pathParts = file.path.split('/');
    const fileName = pathParts.pop() || file.path;
    const parentPath = pathParts.join('/');

    if (parentPath) {
      let currentPath = '';
      for (const folder of pathParts) {
        const folderPath = currentPath ? `${currentPath}/${folder}` : folder;
        createFolder(currentPath, folder);
        currentPath = folderPath;
      }
    }

    // Create the file immediately with empty/partial content
    createFile(parentPath, fileName, file.content || '// Loading...');

    // Open the file in editor
    const fileId = crypto.randomUUID();
    openFile({
      id: fileId,
      name: fileName,
      path: file.path,
      content: file.content || '// Loading...',
      language: getLanguage(file.path),
      isDirty: true,
    });
  }, [createFile, createFolder, openFile]);

  // Update file content as it streams
  const handleFileProgress = useCallback((file: StreamingFileOperation) => {
    // Skip if file wasn't started (limit reached)
    if (!createdFilePaths.current.has(file.path)) return;

    // Update the file content in real-time
    if (file.content) {
      updateFileContent(file.path, file.content);
    }
  }, [updateFileContent]);

  // Finalize file when complete
  const handleFileComplete = useCallback(async (file: StreamingFileOperation) => {
    // Skip if file wasn't started (limit reached)
    if (!createdFilePaths.current.has(file.path)) {
      log.info('[AI] ⏭️ Skipping completion for non-started file:', file.path);
      return;
    }

    log.info('[AI] ✅ File completed:', file.path);
    setCurrentStreamingFile(null);
    setCreatedFilesCount(prev => prev + 1);

    // Final update with complete content
    if (file.content) {
      updateFileContent(file.path, file.content);
    }

    // Sync file to backend server if we have a project
    if (currentProject?.id) {
      try {
        const pathParts = file.path.split('/').filter(p => p);
        const fileName = pathParts.pop() || file.path;

        await filesApiService.createFile({
          projectId: currentProject.id,
          path: file.path.startsWith('/') ? file.path : '/' + file.path,
          name: fileName,
          content: file.content || '',
          type: 'FILE',
        });
        log.info('[AI] 📁 File synced to backend:', file.path);
      } catch (error) {
        log.error('[AI] Failed to sync file to backend:', error);
        // Don't throw - local file is still created
      }
    }

    // Also call the external handler if provided
    if (onFileOperation) {
      onFileOperation({
        type: file.type as 'create' | 'edit' | 'delete',
        path: file.path,
        content: file.content,
      });
    }
  }, [updateFileContent, onFileOperation, currentProject]);

  // Handle terminal command from AI
  const handleTerminalCommand = useCallback((command: string) => {
    log.info('[AI] Terminal command:', command);
    if (onTerminalCommand) {
      onTerminalCommand(command);
    }
  }, [onTerminalCommand]);

  // Handle WebContainer commands from AI
  const handleCommand = useCallback(async (command: StreamingCommand) => {
    log.info('[AI] 🔧 Command:', command);

    try {
      switch (command.type) {
        case 'install':
          setWebContainerStatus('installing');
          // First mount all files to WebContainer
          if (files.length > 0) {
            await webContainerService.writeFiles(files);
          }
          // Then run npm install
          const installResult = await webContainerService.runCommand('npm', ['install']);
          if (installResult.exitCode === 0) {
            log.info('[AI] ✅ Dependencies installed');
          }
          break;

        case 'start':
          setWebContainerStatus('running');
          // Mount files first
          if (files.length > 0) {
            await webContainerService.writeFiles(files);
          }
          // Start dev server
          const serverResult = await webContainerService.startDevServer('npm', ['start']);
          if (serverResult.url) {
            setServerUrl(serverResult.url);
            log.info('[AI] 🚀 Server started at:', serverResult.url);
          }
          break;

        case 'rebuild':
          setWebContainerStatus('installing');
          await webContainerService.writeFiles(files);
          await webContainerService.runCommand('npm', ['run', 'build']);
          break;

        case 'terminal':
          if (command.command) {
            const parts = command.command.split(' ');
            await webContainerService.runCommand(parts[0], parts.slice(1));
          }
          break;
      }
    } catch (error) {
      log.error('[AI] Command error:', error);
      setWebContainerStatus('error');
    }
  }, [files]);

  // Voice input handler
  const handleVoiceInput = async () => {
    if (!speechSupport.recognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      voiceInput.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    voiceInput.start({
      onResult: (result) => {
        setInput(prev => result.isFinal ? result.transcript : prev);
      },
      onError: (error) => {
        log.error('Voice input error:', error);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    }, { continuous: true, interimResults: true });
  };

  // File upload handler
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUploadedFiles: Array<{ name: string, content: string, type: string, isImage?: boolean }> = [];

    for (const file of Array.from(files)) {
      try {
        const isImage = file.type.startsWith('image/');
        if (isImage) {
          // Read images as base64 data URL
          const content = await readFileAsBase64(file);
          newUploadedFiles.push({
            name: file.name,
            content,
            type: file.type,
            isImage: true,
          });
        } else {
          // Read text files as text
          const content = await readFileAsText(file);
          newUploadedFiles.push({
            name: file.name,
            content,
            type: file.type || 'text/plain',
            isImage: false,
          });
        }
      } catch (error) {
        log.error(`Failed to read file ${file.name}:`, error);
      }
    }

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Speak response
  const handleSpeak = (text: string) => {
    if (!externalVoiceEnabled || !speechSupport.synthesis) return;

    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`[^`]+`/g, '')
      .slice(0, 500);

    voiceOutput.speak(cleanText, {
      rate: 1,
      pitch: 1,
      onEnd: () => { },
      onError: () => { },
    });
  };

  // 🏗️ SSE STREAMING — Backend defines tools → Model chooses → Backend executes
  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isAiLoading || isStreaming) return;

    // Reset file tracking for new message
    createdFilePaths.current.clear();

    // Separate images from text files
    const imageFiles = uploadedFiles.filter(f => f.isImage);
    const textFiles = uploadedFiles.filter(f => !f.isImage);

    // Build display message for chat history
    let displayMessage = input;
    if (textFiles.length > 0) {
      const fileContents = textFiles.map(file =>
        `\n\n📎 **Attached file: ${file.name}**\n\`\`\`\n${file.content}\n\`\`\``
      ).join('');
      displayMessage = (input || 'Here are some files:') + fileContents;
    }
    if (imageFiles.length > 0) {
      displayMessage = (displayMessage || 'Analyze this image:') + `\n\n🖼️ **${imageFiles.length} image(s) attached**`;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: displayMessage,
      timestamp: Date.now(),
      attachments: imageFiles.map(f => ({
        type: 'image' as const,
        name: f.name,
        content: f.content,
        mimeType: f.type,
      })),
    };

    addMessage(userMessage);
    setInput('');
    setUploadedFiles([]);
    setAiLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    setLiveToolEvents([]);
    setCreatedFilesCount(0);

    const toolEventsCollected: ToolEvent[] = [];
    let fullText = '';

    try {
      // Build project files map
      const projectFiles: Record<string, string> = {};
      for (const f of files) {
        if (f.type === 'file' && f.content) {
          projectFiles[f.path] = f.content;
        }
      }

      // Build conversation history for SSE
      const history = chatHistory.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      // Prepare prompt with file context
      let fullPrompt = input;
      if (activeFile) {
        fullPrompt += `\n\n[Current file: ${activeFile.name}]\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\``;
      }
      if (textFiles.length > 0) {
        const fileContents = textFiles.map(file =>
          `\n\n📎 **${file.name}**\n\`\`\`\n${file.content}\n\`\`\``
        ).join('');
        fullPrompt += fileContents;
      }

      // Route to multi-agent orchestrator or single-agent stream
      const endpoint = selectedAgent === 'orchestrator'
        ? '/api/canvas/agent-stream'
        : '/api/canvas/stream';

      const response = await fetchWithCredentials(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: fullPrompt,
          projectFiles,
          history,
          appId: 'maula-editor',
          editorContext: editorBridge.getAgentContext(),
          agent: selectedAgent,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'status':
                setAgentStatus({ status: 'working', agent: selectedAgent, message: event.message });
                break;
              case 'text':
                fullText += event.content || '';
                setStreamingContent(fullText);
                break;
              case 'tool_start': {
                const te: ToolEvent = { type: 'tool_start', tool: event.tool, input: event.input, timestamp: Date.now() };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'worker_text': {
                const wte: ToolEvent = {
                  type: 'worker_text',
                  agent: (event as any).agent,
                  agentName: (event as any).name,
                  taskId: (event as any).taskId,
                  content: event.content,
                  summary: `${(event as any).name || (event as any).agent}: ${(event.content || '').slice(0, 120)}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(wte);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'agent_event': {
                const agentEvt: ToolEvent = {
                  type: 'agent_event',
                  agent: (event as any).agent,
                  agentName: (event as any).name,
                  event: (event as any).event,
                  taskId: (event as any).taskId,
                  provider: (event as any).provider,
                  model: (event as any).model,
                  latencyMs: (event as any).latencyMs,
                  summary: event.message || `${(event as any).name || (event as any).agent}: ${(event as any).event}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(agentEvt);
                setLiveToolEvents([...toolEventsCollected]);
                if ((event as any).event === 'thinking') {
                  setAgentStatus({ status: 'working', agent: selectedAgent, message: `🧠 Team Manager analyzing...` });
                } else if ((event as any).event === 'started') {
                  setAgentStatus({ status: 'working', agent: selectedAgent, message: `⚡ ${(event as any).name} starting...` });
                } else if ((event as any).event === 'working') {
                  setAgentStatus({ status: 'working', agent: selectedAgent, message: `🔧 ${(event as any).name} working...` });
                } else if ((event as any).event === 'completed') {
                  setAgentStatus({ status: 'working', agent: selectedAgent, message: `✅ ${(event as any).name} done!` });
                } else if ((event as any).event === 'summarizing') {
                  setAgentStatus({ status: 'working', agent: selectedAgent, message: `📋 Team Manager reviewing work...` });
                }
                break;
              }
              case 'tool_result': {
                const te: ToolEvent = { type: 'tool_result', tool: event.tool, success: event.success, summary: event.summary, timestamp: Date.now() };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'file_write':
                if (event.path && event.content !== undefined) {
                  // Create file in store
                  const pathParts = event.path.split('/').filter(Boolean);
                  const fileName = pathParts.pop() || event.path;
                  const parentPath = pathParts.join('/');

                  // Create parent folders
                  if (parentPath) {
                    let currentPath = '';
                    for (const folder of pathParts) {
                      const folderPath = currentPath ? `${currentPath}/${folder}` : folder;
                      const folderExists = files.some(f => f.path === folderPath && f.type === 'folder');
                      if (!folderExists) createFolder(currentPath, folder);
                      currentPath = folderPath;
                    }
                  }

                  createFile(parentPath, fileName, event.content);
                  setCreatedFilesCount(prev => prev + 1);

                  // Open file in editor
                  openFile({
                    id: crypto.randomUUID(),
                    name: fileName,
                    path: event.path,
                    content: event.content,
                    language: getLanguage(event.path),
                    isDirty: false,
                  });

                  toolEventsCollected.push({ type: 'file_write', path: event.path, timestamp: Date.now() });
                  setLiveToolEvents([...toolEventsCollected]);
                }
                break;
              case 'file_delete':
                if (event.path) {
                  deleteNode(event.path);
                  toolEventsCollected.push({ type: 'file_delete', path: event.path, timestamp: Date.now() });
                  setLiveToolEvents([...toolEventsCollected]);
                }
                break;
              case 'command_output':
                toolEventsCollected.push({ type: 'command_output', content: event.content, timestamp: Date.now() });
                setLiveToolEvents([...toolEventsCollected]);
                if (onTerminalCommand && event.content) onTerminalCommand(event.content);
                break;
              case 'image_result': {
                const te: ToolEvent = {
                  type: 'image_result',
                  imageUrl: event.imageUrl,
                  dataUrl: event.dataUrl,
                  imageUrls: event.imageUrls,
                  width: event.width,
                  height: event.height,
                  format: event.format,
                  summary: `Image ${event.width || '?'}×${event.height || '?'} ${event.format || 'png'}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'video_result': {
                const te: ToolEvent = {
                  type: 'video_result',
                  videoUrl: event.videoUrl,
                  videoUrls: event.videoUrls,
                  thumbnailUrl: event.thumbnailUrl,
                  duration: event.duration,
                  width: event.width,
                  height: event.height,
                  format: event.format,
                  summary: `Video ${event.width || '?'}×${event.height || '?'} ${event.format || 'mp4'} ${event.duration ? `(${Math.round(event.duration)}s)` : ''}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'archive_result': {
                const te: ToolEvent = {
                  type: 'archive_result',
                  format: (event as any).format,
                  summary: (event as any).operation
                    ? `Archive ${(event as any).operation}: ${(event as any).sizeFormatted || ''} ${(event as any).format || 'zip'}${(event as any).entryCount ? ` (${(event as any).entryCount} files)` : ''}${(event as any).safe !== undefined ? ((event as any).safe ? ' ✓ safe' : ' ⚠ unsafe') : ''}`
                    : (event as any).message || 'Archive operation complete',
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'backend_result': {
                const te: ToolEvent = {
                  type: 'backend_result',
                  summary: (event as any).message || `Backend ${(event as any).operation || 'tool'}: ${(event as any).fileCount ? `${(event as any).fileCount} file(s) generated` : 'complete'}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'code_result': {
                const te: ToolEvent = {
                  type: 'code_result',
                  tool: (event as any).tool,
                  summary: (event as any).message || `Code ${(event as any).tool || 'tool'}: ${(event as any).success ? 'success' : 'failed'}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              case 'editor_command': {
                // Execute editor commands for cursor/selection control
                const cmd = event.editorCommand;
                if (cmd === 'setCursor' && event.line !== undefined) {
                  editorBridge.setCursor({ line: event.line, column: event.column || 0 });
                } else if (cmd === 'setSelection' && event.startLine !== undefined) {
                  editorBridge.setSelection(
                    { line: event.startLine, column: event.startColumn || 0 },
                    { line: event.endLine || event.startLine, column: event.endColumn || 0 }
                  );
                } else if (cmd === 'insertAtCursor' && event.text) {
                  editorBridge.insertAtCursor(event.text);
                } else if (cmd === 'replaceSelection' && event.text !== undefined) {
                  editorBridge.replaceSelection(event.text);
                }
                const te: ToolEvent = {
                  type: 'editor_command',
                  tool: 'editor_control',
                  summary: `Editor: ${cmd}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              // Agent Memory Events
              case 'agent_memory_result': {
                const te: ToolEvent = {
                  type: 'agent_memory',
                  tool: 'agent_memory',
                  summary: event.message || `Memory: ${(event as any).action}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              // Agent Approval Request
              case 'agent_approval_request': {
                // Show approval dialog to user
                const approvalId = (event as any).approvalId;
                const operation = (event as any).operation;
                const details = (event as any).details;
                const level = (event as any).level;

                // TODO: Implement approval modal
                log.info(`[Approval Request] ${level}: ${operation} - ${details}`);

                const te: ToolEvent = {
                  type: 'agent_approval',
                  tool: 'agent_safety',
                  summary: `Approval needed: ${operation} (${level})`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              // Agent UI Message
              case 'agent_ui_message': {
                const msgType = (event as any).messageType;
                const text = (event as any).text;
                log.info(`[Agent ${msgType}]`, text);

                const te: ToolEvent = {
                  type: 'agent_ui',
                  tool: 'agent_ui',
                  summary: `${msgType}: ${text?.substring(0, 50)}${(text?.length || 0) > 50 ? '...' : ''}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              // Agent UI Question
              case 'agent_ui_question': {
                const question = (event as any).question;
                const questionId = (event as any).questionId;

                // TODO: Implement question input modal
                log.info(`[Agent Question] ${questionId}: ${question}`);

                const te: ToolEvent = {
                  type: 'agent_ui',
                  tool: 'agent_ui',
                  summary: `Question: ${question?.substring(0, 40)}...`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              // Agent UI Progress
              case 'agent_ui_progress': {
                const progress = (event as any).progress;
                log.info(`[Agent Progress] ${progress}%`);
                break;
              }
              // Agent UI Toast
              case 'agent_ui_toast': {
                const text = (event as any).text;
                log.info(`[Agent Toast]`, text);
                break;
              }
              // Agent Mode Change
              case 'agent_mode_change': {
                const newMode = (event as any).newMode;
                const prevMode = (event as any).previousMode;

                const te: ToolEvent = {
                  type: 'agent_control',
                  tool: 'agent_control',
                  summary: `Mode: ${prevMode} → ${newMode}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              // Agent Task Events
              case 'agent_task_started':
              case 'agent_task_completed':
              case 'agent_task_cancelled': {
                const taskName = (event as any).taskName;
                const status = event.type.replace('agent_task_', '');

                const te: ToolEvent = {
                  type: 'agent_control',
                  tool: 'agent_control',
                  summary: `Task ${status}: ${taskName}`,
                  timestamp: Date.now(),
                };
                toolEventsCollected.push(te);
                setLiveToolEvents([...toolEventsCollected]);
                break;
              }
              // Agent Status Change
              case 'agent_status_change': {
                const status = (event as any).status;
                log.info(`[Agent Status] ${status}`);
                break;
              }
              case 'done':
                // Apply final project files
                if (event.projectFiles) {
                  Object.entries(event.projectFiles).forEach(([path, content]) => {
                    const pp = path.split('/').filter(Boolean);
                    const fn = pp.pop() || path;
                    const parent = pp.join('/');
                    if (parent) {
                      let cp = '';
                      for (const folder of pp) {
                        const fp = cp ? `${cp}/${folder}` : folder;
                        if (!files.some(f => f.path === fp && f.type === 'folder')) createFolder(cp, folder);
                        cp = fp;
                      }
                    }
                    createFile(parent, fn, content as string);
                  });
                }
                break;
              case 'error':
                throw new Error(event.error || 'Generation failed');
            }
          } catch (parseErr: any) {
            if (parseErr.message?.includes('Generation failed') || parseErr.message?.includes('HTTP')) throw parseErr;
          }
        }
      }

      // Build assistant message with tool events
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullText || 'Done! Your code has been generated.',
        timestamp: Date.now(),
        toolEvents: toolEventsCollected.length > 0 ? [...toolEventsCollected] : undefined,
      };
      addMessage(assistantMessage);

      if (externalVoiceEnabled && speechSupport.synthesis) {
        handleSpeak(fullText);
      }

    } catch (error) {
      log.error('AI error:', error);
      setStreamingContent('');

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    } finally {
      setAiLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
      setLiveToolEvents([]);
      setCurrentStreamingFile(null);
      setAgentStatus(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: '✨ Generate', prompt: 'Generate code for: ' },
    { label: '🏗️ Build App', prompt: 'Build a complete app: ' },
    { label: '🔧 Fix Error', prompt: 'Fix this error: ' },
    { label: '📝 Explain', prompt: 'Explain this code: ' },
  ];

  // Render markdown content
  const renderContent = (content: string) => {
    // Clean file operation tags for display
    const cleanContent = content
      .replace(/<dyad-write[^>]*>[\s\S]*?<\/dyad-write>/gi, '\n✅ FILE_CREATED\n')
      .replace(/<file_create[^>]*>[\s\S]*?<\/file_create>/gi, '\n✅ FILE_CREATED\n')
      .replace(/<dyad-search-replace[^>]*>[\s\S]*?<\/dyad-search-replace>/gi, '\n✅ FILE_UPDATED\n')
      .replace(/<file_edit[^>]*>[\s\S]*?<\/file_edit>/gi, '\n✅ FILE_UPDATED\n')
      .replace(/<dyad-delete[^>]*>[\s\S]*?<\/dyad-delete>/gi, '\n🗑️ FILE_DELETED\n')
      .replace(/<file_delete[^>]*\/?>/gi, '\n🗑️ FILE_DELETED\n');

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            if (isInline) {
              return (
                <code className={`${isDark ? 'bg-vscode-input text-vscode-accent' : 'bg-gray-100 text-gray-800'} px-1.5 py-0.5 text-sm font-mono rounded`}>
                  {children}
                </code>
              );
            }

            return (
              <div className={`relative mt-2 overflow-hidden rounded border ${isDark ? 'bg-vscode-bg border-vscode-border' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`flex items-center justify-between px-3 py-1.5 ${isDark ? 'bg-vscode-sidebar text-vscode-textMuted' : 'bg-gray-100 text-gray-600'} text-xs font-medium`}>
                  <span>{match[1]}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children))}
                    className={`hover:text-vscode-accent transition-colors`}
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto text-sm">
                  <code className={`${className} ${isDark ? 'text-vscode-text' : 'text-gray-800'}`}>{children}</code>
                </pre>
              </div>
            );
          },
          p({ children }) {
            return <p className="mb-2 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-none mb-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-none mb-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="before:content-['▸'] before:mr-2 before:text-vscode-accent">{children}</li>;
          },
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`flex flex-col h-full ${bgClass} font-mono`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-vscode-border bg-vscode-sidebar' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-vscode-accent">⚡</span>
          <span className={`font-semibold text-sm ${textClass}`}>AI CHAT</span>
          {/* Provider Badge */}
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400"
            title="AI Engine • SSE Streaming"
          >
            AI Engine • SSE
          </span>
          {activeChatSessionId && chatSessions.find(s => s.id === activeChatSessionId) && (
            <span className={`text-xs ${mutedTextClass} max-w-32 truncate`}>
              - {chatSessions.find(s => s.id === activeChatSessionId)?.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Chat History Button */}
          <button
            onClick={() => setShowChatHistory(!showChatHistory)}
            className={`p-1.5 rounded transition-colors ${showChatHistory
              ? 'bg-vscode-accent text-white'
              : isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            title="Chat History"
          >
            <HistoryIcon />
          </button>

          {/* New Chat Button */}
          <button
            onClick={() => {
              createChatSession();
            }}
            className={`p-1.5 rounded transition-colors ${isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            title="New Chat"
          >
            <PlusIcon />
          </button>

          {/* Delete Current Chat Button */}
          {activeChatSessionId && (
            <button
              onClick={() => {
                if (activeChatSessionId && confirm('Delete this chat?')) {
                  deleteChatSession(activeChatSessionId);
                }
              }}
              className={`p-1.5 rounded transition-colors ${isDark ? 'text-vscode-textMuted hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                }`}
              title="Delete Chat"
            >
              <TrashIcon />
            </button>
          )}

          {/* Clear Chat Button (when no session) */}
          {!activeChatSessionId && chatHistory.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear this chat?')) {
                  clearChat();
                }
              }}
              className={`p-1.5 rounded transition-colors ${isDark ? 'text-vscode-textMuted hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                }`}
              title="Clear Chat"
            >
              <TrashIcon />
            </button>
          )}

          {/* AI Extension Settings Button */}
          <button
            onClick={() => setShowExtensionSettings(true)}
            className={`p-1.5 rounded transition-colors ${isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            title={`AI Settings (${extensionConfig.provider} - ${extensionConfig.model})`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat History Sidebar */}
      {showChatHistory && (
        <div className={`border-b ${isDark ? 'border-vscode-border bg-vscode-bg' : 'border-gray-200 bg-white'} max-h-64 overflow-y-auto`}>
          <div className={`px-3 py-2 text-xs font-semibold ${mutedTextClass} sticky top-0 ${isDark ? 'bg-vscode-bg' : 'bg-white'} border-b ${isDark ? 'border-vscode-border' : 'border-gray-100'}`}>
            CHAT HISTORY ({chatSessions.length})
          </div>

          {chatSessions.length === 0 ? (
            <div className={`px-3 py-4 text-center text-sm ${mutedTextClass}`}>
              No chat history yet
            </div>
          ) : (
            <div className="py-1">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${session.id === activeChatSessionId
                    ? isDark ? 'bg-vscode-accent/20 border-l-2 border-vscode-accent' : 'bg-blue-50 border-l-2 border-blue-500'
                    : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                  onClick={() => {
                    if (editingSessionId !== session.id) {
                      switchChatSession(session.id);
                      setShowChatHistory(false);
                    }
                  }}
                >
                  <ChatIcon />
                  <div className="flex-1 min-w-0">
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                          if (editingName.trim()) {
                            renameChatSession(session.id, editingName.trim());
                          }
                          setEditingSessionId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editingName.trim()) {
                              renameChatSession(session.id, editingName.trim());
                            }
                            setEditingSessionId(null);
                          } else if (e.key === 'Escape') {
                            setEditingSessionId(null);
                          }
                        }}
                        className={`w-full px-1 py-0.5 text-sm rounded ${isDark ? 'bg-vscode-input border-vscode-border text-white' : 'bg-white border-gray-300'} border outline-none focus:border-vscode-accent`}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div className={`text-sm truncate ${textClass}`}>{session.name}</div>
                        <div className={`text-xs ${mutedTextClass}`}>
                          {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSessionId(session.id);
                        setEditingName(session.name);
                      }}
                      className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                      title="Rename"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this chat?')) {
                          deleteChatSession(session.id);
                        }
                      }}
                      className={`p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Chat at Bottom */}
          <div className={`px-3 py-2 border-t ${isDark ? 'border-vscode-border' : 'border-gray-100'}`}>
            <button
              onClick={() => {
                createChatSession();
                setShowChatHistory(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${isDark
                ? 'bg-vscode-accent/20 text-vscode-accent hover:bg-vscode-accent/30'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
            >
              <PlusIcon />
              New Chat
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 && !isStreaming && (
          <div className="text-center py-12 border border-dashed border-vscode-border rounded-lg">
            <div className="text-5xl mb-4 text-vscode-accent">⚡</div>
            <h3 className={`text-xl font-semibold ${textClass} mb-2`}>Ready to Build</h3>
            <p className={`${mutedTextClass} text-sm`}>I create apps, write code, and build projects</p>

            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => setInput(action.prompt)}
                  className={`px-2.5 py-1 text-xs font-medium transition-all rounded ${isDark
                    ? 'text-vscode-textMuted hover:text-white hover:bg-white/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg, msgIndex) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${msg.role === 'user'
              ? 'bg-vscode-accent text-white shadow-lg px-4 py-3 rounded-lg'
              : ''
              }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
              ) : (
                <div className={`px-4 py-3 rounded-lg ${isDark ? 'bg-vscode-sidebar border border-vscode-border text-vscode-text' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {renderContent(msg.content)}
                  </div>

                  {/* Tool events attached to message */}
                  {msg.toolEvents && msg.toolEvents.length > 0 && (
                    <div className={`mt-2 space-y-1`}>
                      {msg.toolEvents.map((te, i) => {
                        // ── Multi-Agent: agent_event rendering ──
                        if (te.type === 'agent_event') {
                          const eventColors: Record<string, string> = {
                            thinking: 'border-purple-500/30 bg-purple-500/5 text-purple-400/90',
                            responded: 'border-blue-500/30 bg-blue-500/5 text-blue-400/90',
                            started: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400/90',
                            working: 'border-amber-500/30 bg-amber-500/5 text-amber-400/90',
                            completed: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400/90',
                            failed: 'border-red-500/30 bg-red-500/5 text-red-400/90',
                            fallback: 'border-orange-500/30 bg-orange-500/5 text-orange-400/90',
                            summarizing: 'border-blue-500/30 bg-blue-500/5 text-blue-400/90',
                          };
                          const colorClass = eventColors[(te as any).event || ''] || 'border-zinc-700/30 bg-zinc-700/5 text-zinc-400/90';
                          const isActive = (te as any).event === 'started' || (te as any).event === 'working' || (te as any).event === 'thinking';
                          return (
                            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[11px] ${colorClass} ${isActive ? 'animate-pulse' : ''}`}>
                              <span className="text-sm">{getToolEventIcon(te)}</span>
                              <span className="font-bold">{getToolEventLabel(te).split(' — ')[0]}</span>
                              <span className="text-[10px] opacity-80">{te.summary || (te as any).event}</span>
                              {(te as any).latencyMs && <span className="text-[9px] opacity-50 ml-auto">{((te as any).latencyMs / 1000).toFixed(1)}s</span>}
                            </div>
                          );
                        }
                        // ── Multi-Agent: worker_text rendering ──
                        if (te.type === 'worker_text') {
                          const workerLabels: Record<string, string> = {
                            codeBuild: 'Code Architect', deepThink: 'Deep Thinker', imageGen: 'Visual Designer',
                            research: 'Research Analyst', fastCode: 'Quick Builder', analysis: 'Code Reviewer',
                          };
                          const workerLabel = workerLabels[(te as any).agent || ''] || (te as any).agentName || (te as any).agent;
                          return (
                            <div key={i} className="px-3 py-2 bg-indigo-500/5 border border-indigo-500/20 rounded-lg text-[11px]">
                              <div className="flex items-center gap-2 text-indigo-400/80 mb-1">
                                <span>🤖</span>
                                <span className="font-bold uppercase tracking-wider text-[10px]">{workerLabel}</span>
                              </div>
                              <p className="text-zinc-400 text-[11px] leading-relaxed">{te.content?.slice(0, 300)}</p>
                            </div>
                          );
                        }
                        // ── Standard tool event rendering ──
                        return (
                          <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${te.type === 'tool_start' ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-700') :
                            te.type === 'tool_result' ? (te.success
                              ? (isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-green-50 border border-green-200 text-green-700')
                              : (isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-700')) :
                              te.type === 'file_write' ? (isDark ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' : 'bg-violet-50 border border-violet-200 text-violet-700') :
                                te.type === 'file_delete' ? (isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-700') :
                                  (isDark ? 'bg-vscode-bg/50 text-vscode-textMuted border border-vscode-border' : 'bg-gray-50 text-gray-500 border border-gray-200')
                            }`}>
                            <span>{getToolEventIcon(te)}</span>
                            <span className="font-bold uppercase tracking-wider text-[10px]">{getToolEventLabel(te)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Action Icons */}
                  <div className={`flex items-center gap-1 mt-3 pt-2 border-t ${isDark ? 'border-vscode-border' : 'border-gray-100'}`}>
                    {/* Regenerate */}
                    <button
                      onClick={() => {
                        // Find the user message before this one and regenerate
                        const userMsgIndex = chatHistory.slice(0, msgIndex).reverse().findIndex(m => m.role === 'user');
                        if (userMsgIndex !== -1) {
                          const actualIndex = msgIndex - 1 - userMsgIndex;
                          const userMsg = chatHistory[actualIndex];
                          if (userMsg) {
                            setInput(userMsg.content);
                          }
                        }
                      }}
                      className={`p-1.5 rounded transition-colors ${isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      title="Regenerate response"
                    >
                      <RefreshIcon />
                    </button>

                    {/* Copy */}
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(msg.content);
                          setCopiedMessageId(msg.id);
                          setTimeout(() => setCopiedMessageId(null), 2000);
                        } catch (err) {
                          log.error('Failed to copy:', err);
                        }
                      }}
                      className={`p-1.5 rounded transition-colors ${copiedMessageId === msg.id ? 'text-green-500' : isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      title={copiedMessageId === msg.id ? 'Copied!' : 'Copy response'}
                    >
                      {copiedMessageId === msg.id ? <CheckIcon /> : <CopyIcon />}
                    </button>

                    {/* Thumbs Up */}
                    <button
                      onClick={() => {
                        setMessageFeedback(prev => ({
                          ...prev,
                          [msg.id]: prev[msg.id] === 'up' ? null : 'up'
                        }));
                      }}
                      className={`p-1.5 rounded transition-colors ${messageFeedback[msg.id] === 'up' ? 'text-green-500' : isDark ? 'text-vscode-textMuted hover:text-green-400 hover:bg-white/10' : 'text-gray-400 hover:text-green-500 hover:bg-gray-100'}`}
                      title="Good response"
                    >
                      <ThumbsUpIcon filled={messageFeedback[msg.id] === 'up'} />
                    </button>

                    {/* Thumbs Down */}
                    <button
                      onClick={() => {
                        setMessageFeedback(prev => ({
                          ...prev,
                          [msg.id]: prev[msg.id] === 'down' ? null : 'down'
                        }));
                      }}
                      className={`p-1.5 rounded transition-colors ${messageFeedback[msg.id] === 'down' ? 'text-red-500' : isDark ? 'text-vscode-textMuted hover:text-red-400 hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'}`}
                      title="Bad response"
                    >
                      <ThumbsDownIcon filled={messageFeedback[msg.id] === 'down'} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className={`max-w-[85%] px-4 py-3 rounded-lg border ${isDark ? 'bg-vscode-sidebar border-vscode-accent text-vscode-text' : 'bg-white border-blue-300 text-gray-800'
              }`}>
              {/* Active agent indicator */}
              {agentStatus && (
                <div className={`flex items-center gap-2 mb-3 p-2 rounded border ${isDark ? 'bg-vscode-bg border-green-500/50' : 'bg-green-50 border-green-300'
                  }`}>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">
                    {agentStatus.message || 'Working...'}
                  </span>
                </div>
              )}

              {/* Live tool events */}
              {liveToolEvents.length > 0 && (
                <div className={`mb-3 space-y-1`}>
                  {liveToolEvents.slice(-8).map((te, i) => {
                    // ── Multi-Agent: live agent_event ──
                    if (te.type === 'agent_event') {
                      const eventColors: Record<string, string> = {
                        thinking: 'border-purple-500/30 bg-purple-500/5 text-purple-400/90',
                        responded: 'border-blue-500/30 bg-blue-500/5 text-blue-400/90',
                        started: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400/90',
                        working: 'border-amber-500/30 bg-amber-500/5 text-amber-400/90',
                        completed: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400/90',
                        failed: 'border-red-500/30 bg-red-500/5 text-red-400/90',
                        fallback: 'border-orange-500/30 bg-orange-500/5 text-orange-400/90',
                        summarizing: 'border-blue-500/30 bg-blue-500/5 text-blue-400/90',
                      };
                      const colorClass = eventColors[(te as any).event || ''] || 'border-zinc-700/30 bg-zinc-700/5 text-zinc-400/90';
                      const isActive = (te as any).event === 'started' || (te as any).event === 'working' || (te as any).event === 'thinking';
                      return (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[11px] ${colorClass} ${isActive ? 'animate-pulse' : ''}`}>
                          <span className="text-sm">{getToolEventIcon(te)}</span>
                          <span className="font-bold">{getToolEventLabel(te).split(' — ')[0]}</span>
                          <span className="text-[10px] opacity-80">{te.summary || (te as any).event}</span>
                          {(te as any).latencyMs && <span className="text-[9px] opacity-50 ml-auto">{((te as any).latencyMs / 1000).toFixed(1)}s</span>}
                        </div>
                      );
                    }
                    // ── Multi-Agent: live worker_text ──
                    if (te.type === 'worker_text') {
                      const workerLabels: Record<string, string> = {
                        codeBuild: 'Code Architect', deepThink: 'Deep Thinker', imageGen: 'Visual Designer',
                        research: 'Research Analyst', fastCode: 'Quick Builder', analysis: 'Code Reviewer',
                      };
                      const workerLabel = workerLabels[(te as any).agent || ''] || (te as any).agentName || (te as any).agent;
                      return (
                        <div key={i} className="px-3 py-2 bg-indigo-500/5 border border-indigo-500/20 rounded-lg text-[11px]">
                          <div className="flex items-center gap-2 text-indigo-400/80 mb-1">
                            <span>🤖</span>
                            <span className="font-bold uppercase tracking-wider text-[10px]">{workerLabel}</span>
                          </div>
                          <p className="text-zinc-400 text-[11px] leading-relaxed">{te.content?.slice(0, 300)}</p>
                        </div>
                      );
                    }
                    // ── Standard live tool events ──
                    return (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${te.type === 'tool_start' ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 animate-pulse' : 'bg-cyan-50 border border-cyan-200 text-cyan-700 animate-pulse') :
                        te.type === 'tool_result' ? (te.success
                          ? (isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-green-50 border border-green-200 text-green-700')
                          : (isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-700')) :
                          te.type === 'file_write' ? (isDark ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' : 'bg-violet-50 border border-violet-200 text-violet-700') :
                            te.type === 'file_delete' ? (isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-700') :
                              te.type === 'command_output' ? (isDark ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' : 'bg-yellow-50 border border-yellow-200 text-yellow-700') :
                                te.type === 'image_result' ? (isDark ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border border-indigo-200 text-indigo-700') :
                                  te.type === 'video_result' ? (isDark ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' : 'bg-purple-50 border border-purple-200 text-purple-700') :
                                    (isDark ? 'bg-vscode-bg border border-vscode-border text-vscode-textMuted' : 'bg-gray-50 border border-gray-200 text-gray-700')
                        }`}>
                        <span>{getToolEventIcon(te)}</span>
                        <span className="font-bold uppercase tracking-wider text-[10px]">{getToolEventLabel(te)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="prose prose-sm max-w-none dark:prose-invert">
                {renderContent(streamingContent || '█')}
              </div>

              {/* Files created counter */}
              {createdFilesCount > 0 && (
                <div className={`mt-2 text-xs ${mutedTextClass} font-medium border-t border-vscode-border pt-2`}>
                  ✅ {createdFilesCount} file{createdFilesCount > 1 ? 's' : ''} created
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t ${isDark ? 'border-vscode-border' : 'border-gray-200'}`}>
        {/* Uploaded files preview */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border ${isDark ? 'bg-vscode-sidebar border-vscode-border text-vscode-text' : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}
              >
                {file.isImage ? (
                  <img
                    src={file.content}
                    alt={file.name}
                    className="w-8 h-8 object-cover rounded border border-vscode-border"
                  />
                ) : (
                  <span className="text-vscode-accent">◉</span>
                )}
                <span className="max-w-32 truncate font-mono text-xs">{file.name}</span>
                <button
                  onClick={() => removeUploadedFile(index)}
                  className={`ml-1 hover:text-red-500 transition-colors`}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={`flex items-end gap-1.5 p-2 ${inputBgClass} min-w-0`}>
          {/* Hidden file input - accepts both text and image files */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelected}
            className="hidden"
            accept=".txt,.js,.ts,.tsx,.jsx,.py,.json,.html,.css,.md,.yaml,.yml,.xml,.csv,.sql,.sh,.bash,.env,.gitignore,.dockerfile,Dockerfile,.toml,.ini,.cfg,image/*,.png,.jpg,.jpeg,.gif,.webp,.svg"
          />

          {/* Agent selector button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowAgentSelector(!showAgentSelector)}
              className={`p-1 transition-colors flex items-center gap-0.5 text-xs rounded ${isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                } ${selectedAgent !== 'orchestrator' ? 'text-green-400' : ''}`}
              title={`Current: ${AGENTS.find(a => a.id === selectedAgent)?.name || 'Orchestrator'}`}
            >
              <span>{AGENTS.find(a => a.id === selectedAgent)?.icon || '◉'}</span>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Agent dropdown */}
            {showAgentSelector && (
              <div className={`absolute bottom-full left-0 mb-2 w-56 shadow-2xl rounded-lg border ${isDark ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white border-gray-200'
                } max-h-80 overflow-y-auto z-50`}>
                <div className={`px-3 py-2 text-xs font-semibold ${isDark ? 'text-[#808080] bg-[#1e1e1e]' : 'text-gray-500 bg-gray-50'} border-b ${isDark ? 'border-[#3c3c3c]' : 'border-gray-200'}`}>
                  Select Agent
                </div>
                {AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent.id);
                      setShowAgentSelector(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors border-b ${isDark ? 'border-[#3c3c3c]/50' : 'border-gray-100'} ${selectedAgent === agent.id
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-[#252526] hover:bg-[#37373d] text-[#cccccc]' : 'bg-white hover:bg-gray-100 text-gray-700'
                      }`}
                  >
                    <span className="text-lg">{agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{agent.name}</div>
                      <div className={`text-xs truncate ${selectedAgent === agent.id ? 'text-white/70' : mutedTextClass
                        }`}>{agent.description}</div>
                    </div>
                    {selectedAgent === agent.id && (
                      <span className="font-medium">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File upload button */}
          <button
            onClick={handleFileUpload}
            className={`p-1 transition-colors flex-shrink-0 rounded ${isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            title="Upload files or images"
            disabled={isAiLoading || isStreaming}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              uploadedFiles.length > 0
                ? "Describe these files..."
                : selectedAgent === 'orchestrator'
                  ? "Ask me to build something..."
                  : `Ask ${AGENTS.find(a => a.id === selectedAgent)?.name || 'Agent'}...`
            }
            className={`flex-1 min-w-0 resize-none bg-transparent outline-none text-sm ${textClass} placeholder:${mutedTextClass} font-mono`}
            rows={1}
            style={{ minHeight: '24px', maxHeight: '200px' }}
            disabled={isAiLoading || isStreaming}
          />

          <div className="flex items-center gap-1 flex-shrink-0">
            {speechSupport.recognition && (
              <button
                onClick={handleVoiceInput}
                className={`p-1 transition-colors text-xs rounded ${isListening
                  ? 'bg-red-500/20 text-red-400'
                  : isDark ? 'text-vscode-textMuted hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                ◉
              </button>
            )}

            <button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isAiLoading || isStreaming}
              className={`p-1 transition-all rounded ${(input.trim() || uploadedFiles.length > 0) && !isAiLoading && !isStreaming
                ? 'text-vscode-accent hover:bg-vscode-accent/10'
                : isDark ? 'text-vscode-textMuted/50' : 'text-gray-300'
                }`}
            >
              {isAiLoading || isStreaming ? (
                <div className="w-3.5 h-3.5 border border-vscode-accent/30 border-t-vscode-accent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Agent Extension Settings Modal */}
      <AIAgentExtensionSettings
        isOpen={showExtensionSettings}
        onClose={() => setShowExtensionSettings(false)}
      />
    </div>
  );
};

export default AgenticAIChat;
