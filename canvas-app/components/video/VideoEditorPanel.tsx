/**
 * VideoEditorPanel — Main AI Video Editor UI
 *
 * Tabs: Upload → Edit (NL prompt) → Presets → Timeline → Export
 * Pattern matches canvas-studio component style (Tailwind + Lucide icons)
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  Play,
  Pause,
  Wand2,
  Film,
  Scissors,
  Type,
  Music,
  Sparkles,
  Download,
  Check,
  X,
  AlertCircle,
  Clock,
  Loader2,
  ChevronRight,
  SkipForward,
  Zap,
  Shield,
  Volume2,
  Eye,
  Palette,
  Layers,
  MonitorPlay,
  FileVideo,
  RefreshCw,
  Send,
  Video,
  ImageIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { useVideoEditor } from '../../hooks/useVideoEditor';
import {
  VIDEO_PRESETS,
  type VideoPreset,
  type VideoToolCall,
} from '../../services/videoEditorService';
import { userHistoryService } from '../../services/userHistoryService';

export interface VideoHistoryItem {
  id: string;
  prompt: string;
  mode: 'text' | 'image';
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  progress: number;
  videoUrl: string | null;
  taskId: string | null;
  createdAt: number;
  error?: string;
  ratio?: string;
  duration?: number;
  imageUrl?: string;
}

interface VideoEditorPanelProps {
  userId?: string;
  onPreviewVideo?: (url: string, title: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function VideoEditorPanel({
  userId = 'default',
  onPreviewVideo,
}: VideoEditorPanelProps) {
  const editor = useVideoEditor(userId);
  const [prompt, setPrompt] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Video history (persisted in DB via /api/user-history/video) ───
  const [history, setHistoryState] = useState<VideoHistoryItem[]>([]);
  const historyRef = useRef<VideoHistoryItem[]>([]);

  // Hydrate from DB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await userHistoryService.list<VideoHistoryItem>('video', 100);
      if (cancelled || !res.success || !res.items) return;
      const items = res.items.map((row) => ({ ...(row.data as VideoHistoryItem), id: row.id }));
      historyRef.current = items;
      setHistoryState(items);
    })();
    return () => { cancelled = true; };
  }, []);

  // setHistory: updates local state + persists diff to DB.
  // Diff rules: items present in next but not prev → POST.
  // Items in both with shallow-different fields → PATCH.
  // Items in prev but not next → DELETE.
  // If next is empty AND prev was non-empty → clear all.
  const setHistory = useCallback(
    (updater: VideoHistoryItem[] | ((prev: VideoHistoryItem[]) => VideoHistoryItem[])) => {
      const prev = historyRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const capped = next.slice(0, 100);
      historyRef.current = capped;
      setHistoryState(capped);

      const prevIds = new Set(prev.map((x) => x.id));
      const nextIds = new Set(capped.map((x) => x.id));

      // Clear-all shortcut
      if (capped.length === 0 && prev.length > 0) {
        userHistoryService.clear('video');
        return;
      }

      // Inserts
      for (const item of capped) {
        if (!prevIds.has(item.id)) {
          userHistoryService.create<VideoHistoryItem>('video', item, item.id);
        }
      }
      // Deletes
      for (const item of prev) {
        if (!nextIds.has(item.id)) {
          userHistoryService.remove('video', item.id);
        }
      }
      // Updates (shallow change detection)
      const prevById = new Map(prev.map((x) => [x.id, x]));
      for (const item of capped) {
        const old = prevById.get(item.id);
        if (old && old !== item && JSON.stringify(old) !== JSON.stringify(item)) {
          userHistoryService.patch<VideoHistoryItem>('video', item.id, item);
        }
      }
    },
    []
  );

  // ── Lifted generation state (shared between Generate + History tabs) ──
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ item: VideoHistoryItem } | null>(null);
  const [restoredItem, setRestoredItem] = useState<VideoHistoryItem | null>(null);

  const doRestoreItem = useCallback((item: VideoHistoryItem) => {
    editor.setActiveTab('generate');
    setRestoredItem(item);
  }, [editor]);

  const handleHistoryRestore = useCallback((item: VideoHistoryItem) => {
    if (isGenerating) {
      setConfirmModal({ item });
    } else {
      doRestoreItem(item);
    }
  }, [isGenerating, doRestoreItem]);

  // ── Upload handlers ──────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        const { toast } = await import('../../components/shared/Toast');
        toast.error('Invalid File', 'Please upload a video file');
        return;
      }
      await editor.uploadVideo(file);
    },
    [editor]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handlePromptSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim() || editor.isPlanning) return;
      await editor.planEdit(prompt.trim());
      setPrompt('');
    },
    [prompt, editor]
  );

  // ── Tab bar ──────────────────────────────────────────────────
  const tabs = [
    { id: 'history' as const, label: 'History', icon: Clock, disabled: false },
    { id: 'generate' as const, label: 'Generate', icon: Video, disabled: false },
    { id: 'upload' as const, label: 'Upload', icon: Upload, disabled: false },
    {
      id: 'edit' as const,
      label: 'AI Edit',
      icon: Wand2,
      disabled: !editor.project,
    },
    {
      id: 'presets' as const,
      label: 'Presets',
      icon: Zap,
      disabled: !editor.project,
    },
    {
      id: 'timeline' as const,
      label: 'Timeline',
      icon: Film,
      disabled: !editor.activePlan,
    },
    {
      id: 'export' as const,
      label: 'Export',
      icon: Download,
      disabled: !editor.project?.outputFiles.length,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-canvas-card text-white relative">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-canvas-border">
        <MonitorPlay size={18} className="text-violet-400" />
        <span className="font-semibold text-sm">AI Video Editor</span>
        {editor.project && (
          <span className="ml-auto text-xs text-white/40 truncate max-w-[150px]">
            {editor.project.name}
          </span>
        )}
      </div>

      {/* Tab bar — horizontally scrollable */}
      <div className="relative border-b border-canvas-border shrink-0">
        {/* Fade hint on right edge — signals more tabs */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0e0e10] to-transparent z-10" />
        <div
          className="flex overflow-x-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.4) transparent' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && editor.setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors shrink-0 whitespace-nowrap
                ${editor.activeTab === tab.id
                  ? 'text-violet-400 border-b-2 border-violet-400 bg-white/5'
                  : tab.disabled
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
          {/* Extra padding so last tab clears the fade overlay */}
          <div className="shrink-0 w-6" />
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* Keep History + Generate always mounted — hidden by CSS — so async generation survives tab switches */}
        <div className={editor.activeTab === 'history' ? 'h-full flex flex-col' : 'hidden'}>
          <HistoryTab
            history={history}
            setHistory={setHistory}
            onPreviewVideo={onPreviewVideo}
            onNavigateToGenerate={() => editor.setActiveTab('generate')}
            onRestore={handleHistoryRestore}
            isGenerating={isGenerating}
          />
        </div>
        <div className={editor.activeTab === 'generate' ? '' : 'hidden'}>
          <GenerateTab
            editor={editor}
            history={history}
            setHistory={setHistory}
            onPreviewVideo={onPreviewVideo}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            abortRef={abortRef}
            restoredItem={restoredItem}
            onRestoredItemConsumed={() => setRestoredItem(null)}
          />
        </div>
        {editor.activeTab === 'upload' && (
          <UploadTab
            editor={editor}
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleDrop={handleDrop}
            handleFile={handleFile}
            fileInputRef={fileInputRef}
          />
        )}
        {editor.activeTab === 'edit' && (
          <EditTab
            editor={editor}
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handlePromptSubmit}
          />
        )}
        {editor.activeTab === 'presets' && <PresetsTab editor={editor} />}
        {editor.activeTab === 'timeline' && <TimelineTab editor={editor} />}
        {editor.activeTab === 'export' && <ExportTab editor={editor} />}
      </div>

      {/* Generation-in-progress guard modal */}
      {confirmModal && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-canvas-card border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <p className="text-sm font-semibold text-white">Generation in Progress</p>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              A video is currently being generated. Cancel it to open this request, or keep waiting for it to complete.
            </p>
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-xs text-white/70 line-clamp-2">"{confirmModal.item.prompt}"</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-semibold transition-colors"
              >
                Keep Waiting
              </button>
              <button
                onClick={() => {
                  abortRef.current?.abort();
                  abortRef.current = null;
                  setIsGenerating(false);
                  const target = confirmModal.item;
                  setConfirmModal(null);
                  doRestoreItem(target);
                }}
                className="flex-1 py-2.5 bg-primary-600/80 hover:bg-primary-500 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel &amp; Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI GENERATE TAB — RunwayML text-to-video / image-to-video
// ═══════════════════════════════════════════════════════════════════

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';

interface GenerateModel {
  id: string;
  name: string;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
}

interface RatioOption {
  name: string;
  value: string;
  label: string;
}

interface GenerateConfig {
  textToVideoRatios: RatioOption[];
  imageToVideoRatios: RatioOption[];
  durationRange: { min: number; max: number };
  models: GenerateModel[];
}

function GenerateTab({
  editor,
  history,
  setHistory,
  onPreviewVideo,
  isGenerating,
  setIsGenerating,
  abortRef,
  restoredItem,
  onRestoredItemConsumed,
}: {
  editor: ReturnType<typeof useVideoEditor>;
  history: VideoHistoryItem[];
  setHistory: (updater: VideoHistoryItem[] | ((prev: VideoHistoryItem[]) => VideoHistoryItem[])) => void;
  onPreviewVideo?: (url: string, title: string) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
  restoredItem: VideoHistoryItem | null;
  onRestoredItemConsumed: () => void;
}) {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [genPrompt, setGenPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('gen4.5');
  const [selectedRatio, setSelectedRatio] = useState('landscape');
  const [duration, setDuration] = useState(5);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GenerateConfig | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const setHistoryRef = useRef(setHistory);
  setHistoryRef.current = setHistory;

  // Restore a history item into the form when parent signals it
  React.useEffect(() => {
    if (!restoredItem) return;
    setMode(restoredItem.mode);
    setGenPrompt(restoredItem.prompt);
    setImageUrl(restoredItem.imageUrl || '');
    if (restoredItem.ratio) setSelectedRatio(restoredItem.ratio);
    if (restoredItem.duration) setDuration(restoredItem.duration);
    if (restoredItem.status === 'SUCCEEDED' && restoredItem.videoUrl) {
      setGeneratedUrl(restoredItem.videoUrl);
      setTaskStatus('SUCCEEDED');
      setError(null);
    } else {
      setGeneratedUrl(null);
      setTaskStatus(null);
      setError(restoredItem.error || null);
    }
    onRestoredItemConsumed();
  }, [restoredItem]);

  // Fetch available models/ratios on mount
  React.useEffect(() => {
    fetch(`${API_BASE}/api/video/models`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          setConfig({
            models: d.models || [],
            textToVideoRatios: d.textToVideoRatios || [],
            imageToVideoRatios: d.imageToVideoRatios || [],
            durationRange: d.durations?.length
              ? { min: d.durations[0].value, max: d.durations[d.durations.length - 1].value }
              : { min: 2, max: 10 },
          });
          if (d.models?.[0]) setSelectedModel(d.models[0].id);
        }
      })
      .catch(() => { });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const ratios: RatioOption[] = config
    ? mode === 'text'
      ? config.textToVideoRatios
      : config.imageToVideoRatios
    : [];

  const availableModels = config
    ? config.models.filter((m) => (mode === 'text' ? m.supportsTextToVideo : m.supportsImageToVideo))
    : [];

  // Poll for task status
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/video/status/${id}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          const jobId = currentJobIdRef.current;
          setTaskStatus(data.status);
          setProgress(data.progress || 0);
          if (jobId) setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: data.status, progress: data.progress || 0 } : x));
          if (data.status === 'SUCCEEDED' && data.videoUrl) {
            setGeneratedUrl(data.videoUrl);
            setIsGenerating(false);
            if (jobId) setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: 'SUCCEEDED', videoUrl: data.videoUrl, progress: 100 } : x));
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
            setError(data.error || `Video generation ${data.status.toLowerCase()}`);
            setIsGenerating(false);
            if (jobId) setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: data.status as any, error: data.error } : x));
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch { /* will retry */ }
    }, 3000);
  }, []);

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    // Create abort controller so Cancel button and "Cancel & Open" modal can stop the fetch
    const controller = new AbortController();
    abortRef.current = controller;
    const jobId = `vjob_${Date.now()}`;
    currentJobIdRef.current = jobId;
    setIsGenerating(true);
    setError(null);
    setGeneratedUrl(null);
    setTaskStatus('PENDING');
    setProgress(0);

    // Create history entry
    const newItem: VideoHistoryItem = {
      id: jobId, prompt: genPrompt.trim(), mode,
      status: 'PENDING', progress: 0, videoUrl: null,
      taskId: null, createdAt: Date.now(), ratio: selectedRatio, duration,
      imageUrl: mode === 'image' ? imageUrl.trim() : undefined,
    };
    setHistoryRef.current(prev => [newItem, ...prev]);

    const endpoint = mode === 'text' ? '/api/video/generate' : '/api/video/generate-from-image';
    const body: Record<string, unknown> = {
      prompt: genPrompt.trim(),
      model: selectedModel,
      ratio: selectedRatio,
      duration,
    };
    if (mode === 'image') body.imageUrl = imageUrl.trim();

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        // Synchronous completion (backend polled RunwayML inline)
        setGeneratedUrl(data.videoUrl);
        setTaskStatus('SUCCEEDED');
        setIsGenerating(false);
        setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: 'SUCCEEDED', videoUrl: data.videoUrl, taskId: data.taskId || null, progress: 100 } : x));
      } else if (data.success && data.taskId) {
        setTaskId(data.taskId);
        setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, taskId: data.taskId } : x));
        startPolling(data.taskId);
      } else {
        setError(data.error || 'Failed to start generation');
        setIsGenerating(false);
        setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: 'FAILED', error: data.error || 'Failed' } : x));
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Cancelled by user — silent
        setTaskStatus('CANCELLED');
        setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: 'CANCELLED' } : x));
      } else {
        setError('Network error — check connection');
        setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: 'FAILED', error: 'Network error' } : x));
      }
      setIsGenerating(false);
    }
  };

  const handleCancel = async () => {
    // Abort the in-flight HTTP request immediately (works even without a taskId)
    abortRef.current?.abort();
    abortRef.current = null;
    // Also attempt server-side cancel if we received a taskId
    if (taskId) {
      try {
        await fetch(`${API_BASE}/api/video/cancel/${taskId}`, { method: 'DELETE', credentials: 'include' });
      } catch { /* best effort */ }
    }
    if (pollRef.current) clearInterval(pollRef.current);
    const jobId = currentJobIdRef.current;
    if (jobId) setHistoryRef.current(prev => prev.map(x => x.id === jobId ? { ...x, status: 'CANCELLED' } : x));
    setIsGenerating(false);
    setTaskStatus('CANCELLED');
    setTaskId(null);
  };

  const loadIntoEditor = () => {
    if (generatedUrl) {
      editor.loadVideo(generatedUrl, `AI Generated — ${genPrompt.slice(0, 40)}`);
      editor.setActiveTab('edit');
    }
  };

  const promptSuggestions = [
    'A cinematic sunrise over a mountain range with fog rolling through the valleys',
    'An astronaut floating through a neon-lit space station with Earth visible outside',
    'A futuristic cityscape at night with flying cars and holographic billboards',
    'A serene Japanese garden in autumn with koi fish swimming in a pond',
    'A close-up of a cup of coffee with steam rising in slow motion',
    'Ocean waves crashing on a rocky coastline during golden hour',
    'A magical forest with bioluminescent plants glowing at twilight',
    'A time-lapse of a flower blooming in a field of wildflowers',
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-colors
            ${mode === 'text' ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          <Type size={14} />
          Text → Video
        </button>
        <button
          onClick={() => setMode('image')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-colors
            ${mode === 'image' ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          <ImageIcon size={14} />
          Image → Video
        </button>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <label className="text-xs text-white/50 flex items-center gap-1">
          <Sparkles size={12} className="text-violet-400" />
          {mode === 'text' ? 'Describe your video' : 'Describe the motion'}
        </label>
        <textarea
          value={genPrompt}
          onChange={(e) => setGenPrompt(e.target.value)}
          placeholder={mode === 'text'
            ? 'e.g. A cinematic drone shot over a futuristic city at sunset...'
            : 'e.g. Slowly zoom in while the subject looks toward the camera...'}
          rows={3}
          className="w-full bg-white/5 border border-canvas-border rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400 resize-none"
        />
      </div>

      {/* Image URL (for image-to-video mode) */}
      {mode === 'image' && (
        <div className="space-y-2">
          <label className="text-xs text-white/50">Source Image URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full bg-white/5 border border-canvas-border rounded px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
          />
        </div>
      )}

      {/* Model auto-selected on backend — no user-facing selector */}

      {/* Ratio selector */}
      <div className="space-y-2">
        <label className="text-xs text-white/50">Aspect Ratio</label>
        <div className="flex flex-wrap gap-1.5">
          {ratios.map((r) => (
            <button
              key={r.name}
              onClick={() => setSelectedRatio(r.name)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors
                ${selectedRatio === r.name
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-white/5 border-canvas-border text-white/60 hover:text-white hover:border-canvas-border'}`}
            >
              {r.label} <span className="text-white/30 ml-1">{r.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duration slider */}
      <div className="space-y-2">
        <label className="text-xs text-white/50 flex items-center justify-between">
          <span>Duration</span>
          <span className="text-violet-400 font-medium">{duration}s</span>
        </label>
        <input
          type="range"
          min={config?.durationRange.min || 2}
          max={config?.durationRange.max || 10}
          step={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-white/25">
          <span>{config?.durationRange.min || 2}s</span>
          <span>{config?.durationRange.max || 10}s</span>
        </div>
      </div>

      {/* Generate / Cancel buttons */}
      {!isGenerating ? (
        <button
          onClick={handleGenerate}
          disabled={!genPrompt.trim() || (mode === 'image' && !imageUrl.trim())}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Video size={16} />
          Generate Video
        </button>
      ) : (
        <button
          onClick={handleCancel}
          className="w-full py-2.5 bg-primary-600/80 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <X size={14} />
          Cancel Generation
        </button>
      )}

      {/* Generation status */}
      {taskStatus && (
        <div className={`rounded-lg p-3 border space-y-2
          ${taskStatus === 'SUCCEEDED' ? 'bg-green-500/10 border-green-400/20' :
            taskStatus === 'FAILED' || taskStatus === 'CANCELLED' ? 'bg-primary-500/10 border-primary-400/20' :
              'bg-violet-500/10 border-violet-400/20'}`}>
          <div className="flex items-center gap-2">
            {taskStatus === 'SUCCEEDED' ? <Check size={14} className="text-green-400" /> :
              taskStatus === 'FAILED' || taskStatus === 'CANCELLED' ? <X size={14} className="text-primary-400" /> :
                <Loader2 size={14} className="text-violet-400 animate-spin" />}
            <span className="text-xs font-medium">
              {taskStatus === 'PENDING' && 'Starting generation...'}
              {taskStatus === 'RUNNING' && `Generating video... ${progress}%`}
              {taskStatus === 'THROTTLED' && 'Queued — waiting for capacity...'}
              {taskStatus === 'SUCCEEDED' && 'Video generated successfully!'}
              {taskStatus === 'FAILED' && 'Generation failed'}
              {taskStatus === 'CANCELLED' && 'Generation cancelled'}
            </span>
          </div>
          {(taskStatus === 'RUNNING' || taskStatus === 'PENDING') && (
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(progress, taskStatus === 'PENDING' ? 5 : 0)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-primary-500/10 border border-primary-400/20 rounded-lg">
          <AlertCircle size={14} className="text-primary-400 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-primary-300">{error}</span>
        </div>
      )}

      {/* Generated video preview */}
      {generatedUrl && (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden bg-black border border-canvas-border">
            <video
              src={generatedUrl}
              controls
              autoPlay
              className="w-full max-h-[300px]"
              preload="metadata"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadIntoEditor}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Wand2 size={14} />
              Edit in AI Editor
            </button>
            <a
              href={generatedUrl}
              download="ai-generated-video.mp4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Download
            </a>
            {onPreviewVideo && (
              <button
                onClick={() => onPreviewVideo(generatedUrl, genPrompt.slice(0, 60))}
                className="flex-1 py-2 bg-violet-600/80 hover:bg-violet-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <MonitorPlay size={14} />
                Full Preview
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prompt suggestions */}
      {!isGenerating && !generatedUrl && (
        <div className="space-y-2">
          <span className="text-xs text-white/40">Try these prompts</span>
          <div className="flex flex-wrap gap-1.5">
            {promptSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setGenPrompt(s)}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-canvas-border rounded-full text-xs text-white/60 hover:text-white transition-colors"
              >
                {s.length > 50 ? s.slice(0, 50) + '...' : s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UPLOAD TAB
// ═══════════════════════════════════════════════════════════════════

function UploadTab({
  editor,
  dragOver,
  setDragOver,
  handleDrop,
  handleFile,
  fileInputRef,
}: {
  editor: ReturnType<typeof useVideoEditor>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFile: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [urlInput, setUrlInput] = useState('');

  return (
    <div className="p-4 space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${dragOver
            ? 'border-violet-400 bg-violet-500/10'
            : 'border-canvas-border hover:border-canvas-border hover:bg-white/5'
          }
          ${editor.isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {editor.isUploading ? (
          <div className="space-y-3">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-violet-400"
            />
            <p className="text-sm text-white/60">
              Uploading... {editor.uploadProgress}%
            </p>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-violet-500 h-1.5 rounded-full transition-all"
                style={{ width: `${editor.uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <FileVideo size={40} className="mx-auto text-white/30 mb-3" />
            <p className="text-sm font-medium text-white/70">
              Drop video here or click to browse
            </p>
            <p className="text-xs text-white/40 mt-1">
              MP4, WebM, MOV, AVI — up to 500MB
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* URL import */}
      <div className="space-y-2">
        <label className="text-xs text-white/50">Or import from URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="flex-1 bg-white/5 border border-canvas-border rounded px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
          />
          <button
            onClick={() => {
              if (urlInput.trim()) {
                editor.loadVideo(urlInput.trim());
                setUrlInput('');
              }
            }}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded text-xs font-medium transition-colors"
          >
            Import
          </button>
        </div>
      </div>

      {/* Current project info */}
      {editor.project && (
        <div className="bg-white/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-green-400" />
            <span className="text-sm font-medium">{editor.project.name}</span>
          </div>
          {editor.project.sourceMetadata && (
            <div className="grid grid-cols-2 gap-1 text-xs text-white/50">
              <span>
                Duration: {editor.project.sourceMetadata.durationFormatted}
              </span>
              <span>
                Size: {formatBytes(editor.project.sourceMetadata.size)}
              </span>
              <span>
                Resolution: {editor.project.sourceMetadata.width}×
                {editor.project.sourceMetadata.height}
              </span>
              <span>Format: {editor.project.sourceMetadata.format}</span>
              {editor.project.sourceMetadata.fps && (
                <span>FPS: {editor.project.sourceMetadata.fps}</span>
              )}
              {editor.project.sourceMetadata.codec && (
                <span>Codec: {editor.project.sourceMetadata.codec}</span>
              )}
            </div>
          )}
          <button
            onClick={() => editor.setActiveTab('edit')}
            className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-500 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Wand2 size={14} />
            Start Editing
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI EDIT TAB — Natural language prompt
// ═══════════════════════════════════════════════════════════════════

function EditTab({
  editor,
  prompt,
  setPrompt,
  onSubmit,
}: {
  editor: ReturnType<typeof useVideoEditor>;
  prompt: string;
  setPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const suggestions = [
    // 🧠 Understanding & Planning
    'Make this video cinematic',
    'Create 3 viral shorts from this podcast',
    'Clean up this interview — remove silence, fix audio, add captions',
    // ✂️ Trimming & Cutting
    'Remove all silence and dead frames',
    'Auto-detect scenes and split into chapters',
    'Trim to best 60 seconds',
    // 🎬 Highlights & Shorts
    'Extract top 5 highlights as TikTok shorts',
    'Find the best 30-second moment',
    'Create energy-based highlight reel',
    // 📐 Platform Resize
    'Crop for TikTok (9:16) with face tracking',
    'Make Instagram-ready (1:1 square)',
    'Resize for YouTube (16:9 1080p)',
    // 💬 Subtitles & Captions
    'Add captions in English with highlighted words',
    'Transcribe and translate captions to Spanish',
    'Burn emoji captions for social media',
    // 🎨 Style & Look
    'Apply cinematic film look with warm tones',
    'Make it brighter and more vibrant — vlog style',
    'Dark moody aesthetic with grain',
    // 📝 Overlays
    'Add hook text in first 3 seconds',
    'Add lower third with my name',
    'Add watermark and brand overlay',
    // 🎵 Audio
    'Remove background noise and normalize audio',
    'Add background music and fade out at end',
    'Mute audio and replace with music track',
    // 👤 Face & Object
    'Detect and focus on speaker face',
    'Blur background — keep subject sharp',
    'Smart crop to follow face movement',
    // 🛡️ Content Moderation
    'Check for NSFW content before publishing',
    'Run full safety + profanity scan',
    // 🔁 Batch
    'Process all clips with same cinematic filter',
    // 📦 Output
    'Generate a thumbnail and compress for web',
    'Auto-describe this video for metadata',
    'Export as GIF preview',
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Prompt input */}
      <form onSubmit={onSubmit} className="space-y-2">
        <label className="text-xs text-white/50 flex items-center gap-1">
          <Sparkles size={12} className="text-violet-400" />
          Describe what you want
        </label>
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder="e.g. Make this cinematic, add captions, and crop for TikTok..."
            rows={3}
            className="flex-1 bg-white/5 border border-canvas-border rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={!prompt.trim() || editor.isPlanning}
          className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-white/10 disabled:text-white/30 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
        >
          {editor.isPlanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              AI is planning...
            </>
          ) : (
            <>
              <Send size={14} />
              Plan Edit
            </>
          )}
        </button>
      </form>

      {/* Quick suggestions */}
      <div className="space-y-2">
        <span className="text-xs text-white/40">Quick actions</span>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-canvas-border rounded-full text-xs text-white/60 hover:text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Video metadata summary */}
      {editor.project?.sourceMetadata && (
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-white/40 mb-2 flex items-center gap-1">
            <Film size={12} />
            Source Video
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-white/60">
            <span>{editor.project.sourceMetadata.durationFormatted}</span>
            <span>
              {editor.project.sourceMetadata.width}×
              {editor.project.sourceMetadata.height}
            </span>
            <span>{formatBytes(editor.project.sourceMetadata.size)}</span>
            <span>{editor.project.sourceMetadata.format?.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PRESETS TAB — One-click pipelines
// ═══════════════════════════════════════════════════════════════════

function PresetsTab({ editor }: { editor: ReturnType<typeof useVideoEditor> }) {
  const iconMap: Record<string, React.ReactNode> = {
    '🎙️': <Music size={18} />,
    '📚': <Layers size={18} />,
    '🎤': <Volume2 size={18} />,
    '🎬': <Palette size={18} />,
    '▶️': <Play size={18} />,
    '🎵': <Zap size={18} />,
    '🛡️': <Shield size={18} />,
    '🔊': <Volume2 size={18} />,
    '🔇': <Scissors size={18} />,
    '📹': <Film size={18} />,
    '📸': <MonitorPlay size={18} />,
    '👤': <Eye size={18} />,
    '💬': <Type size={18} />,
    '✨': <Sparkles size={18} />,
  };

  return (
    <div className="p-4 space-y-2">
      <p className="text-xs text-white/40 mb-3">
        One-click AI pipelines — select and execute
      </p>
      {VIDEO_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => {
            editor.applyPreset(preset);
          }}
          className="w-full flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 border border-canvas-border hover:border-violet-400/30 rounded-lg transition-all text-left group"
        >
          <div className="mt-0.5 text-violet-400 opacity-70 group-hover:opacity-100">
            {iconMap[preset.icon] || <Sparkles size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white/90">
              {preset.name}
            </div>
            <div className="text-xs text-white/40 mt-0.5">
              {preset.description}
            </div>
            <div className="text-xs text-white/25 mt-1">
              {preset.steps.length} steps:{' '}
              {preset.steps.map((s) => s.action).join(' → ')}
            </div>
          </div>
          <ChevronRight
            size={14}
            className="text-white/20 group-hover:text-violet-400 mt-1"
          />
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TIMELINE TAB — Plan view + execution status
// ═══════════════════════════════════════════════════════════════════

function TimelineTab({
  editor,
}: {
  editor: ReturnType<typeof useVideoEditor>;
}) {
  const plan = editor.activePlan;
  if (!plan) return <EmptyState icon={Film} text="No plan created yet" />;

  const toolIcons: Record<string, React.ReactNode> = {
    video_transform: <Scissors size={14} />,
    video_convert: <RefreshCw size={14} />,
    video_analyze: <Eye size={14} />,
    video_overlay: <Type size={14} />,
    video_filter: <Palette size={14} />,
    video_audio: <Music size={14} />,
    video_ai: <Sparkles size={14} />,
    video_batch: <Layers size={14} />,
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock size={12} className="text-white/30" />,
    running: <Loader2 size={12} className="text-violet-400 animate-spin" />,
    completed: <Check size={12} className="text-green-400" />,
    failed: <X size={12} className="text-primary-400" />,
    skipped: <SkipForward size={12} className="text-white/20" />,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Plan header */}
      <div className="bg-white/5 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">AI Plan</span>
          <StatusBadge status={plan.status} />
        </div>
        <p className="text-sm text-white/80">{plan.interpretation}</p>
        {plan.userPrompt && (
          <p className="text-xs text-white/30 italic">"{plan.userPrompt}"</p>
        )}
      </div>

      {/* Steps timeline */}
      <div className="space-y-1">
        {plan.steps.map((step, i) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all
              ${step.status === 'running'
                ? 'bg-violet-500/10 border-violet-400/30'
                : step.status === 'completed'
                  ? 'bg-green-500/5 border-green-400/20'
                  : step.status === 'failed'
                    ? 'bg-primary-500/5 border-primary-400/20'
                    : 'bg-white/[0.02] border-canvas-border'
              }`}
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {statusIcons[step.status]}
            </div>
            <div className="flex-shrink-0 text-white/40">
              {toolIcons[step.tool] || <Film size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/80">
                {step.tool.replace('video_', '')} → {step.action}
              </div>
              {step.error && (
                <div className="text-xs text-primary-400 mt-0.5 truncate">
                  {step.error}
                </div>
              )}
              {step.result && step.status === 'completed' && (
                <div className="text-xs text-green-400/60 mt-0.5 truncate">
                  {summarizeResult(step)}
                </div>
              )}
            </div>
            <span className="text-xs text-white/20">
              {i + 1}/{plan.steps.length}
            </span>
          </div>
        ))}
      </div>

      {/* Execute / Cancel buttons */}
      <div className="flex gap-2">
        {plan.status === 'planning' && (
          <button
            onClick={editor.executePlan}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Play size={14} />
            Execute Plan ({plan.steps.length} steps)
          </button>
        )}
        {plan.status === 'executing' && (
          <button
            onClick={editor.cancelExecution}
            className="flex-1 py-2.5 bg-primary-600/80 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Pause size={14} />
            Cancel
          </button>
        )}
        {(plan.status === 'completed' || plan.status === 'failed') && (
          <>
            <button
              onClick={() => editor.setActiveTab('edit')}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors"
            >
              New Edit
            </button>
            {editor.project?.outputFiles.length ? (
              <button
                onClick={() => editor.setActiveTab('export')}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Export
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT TAB — Output files + download
// ═══════════════════════════════════════════════════════════════════

function ExportTab({ editor }: { editor: ReturnType<typeof useVideoEditor> }) {
  const outputs = editor.project?.outputFiles || [];

  if (!outputs.length)
    return (
      <EmptyState icon={Download} text="No outputs yet — run an edit first" />
    );

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-white/40">
        {outputs.length} output file{outputs.length > 1 ? 's' : ''}
      </p>

      {outputs.map((file, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-canvas-border"
        >
          <FileVideo size={16} className="text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white/80 truncate">
              {file.filename}
            </div>
            <div className="text-xs text-white/40">
              {file.label} • {file.format?.toUpperCase()}
              {file.size ? ` • ${formatBytes(file.size)}` : ''}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => editor.setPreviewUrl(file.url)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Preview"
            >
              <Eye size={14} className="text-white/50" />
            </button>
            <a
              href={file.url}
              download={file.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Download"
            >
              <Download size={14} className="text-white/50" />
            </a>
          </div>
        </div>
      ))}

      {/* Preview */}
      {editor.previewUrl && (
        <div className="rounded-lg overflow-hidden bg-black border border-canvas-border">
          <video
            src={editor.previewUrl}
            controls
            className="w-full max-h-[300px]"
            preload="metadata"
          />
        </div>
      )}

      {/* Back to edit */}
      <button
        onClick={() => editor.setActiveTab('edit')}
        className="w-full py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Wand2 size={14} />
        Continue Editing
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-white/30">
      <Icon size={32} className="mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planning: 'bg-yellow-500/20 text-yellow-400',
    executing: 'bg-violet-500/20 text-violet-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-primary-500/20 text-primary-400',
    cancelled: 'bg-white/10 text-white/40',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-white/10 text-white/40'}`}
    >
      {status}
    </span>
  );
}

function summarizeResult(step: VideoToolCall): string {
  const r = step.result;
  if (!r) return 'Done';

  if (r.duration) return `${r.durationFormatted || r.duration + 's'}`;
  if (r.faceCount !== undefined) return `${r.faceCount} face(s)`;
  if (r.sceneCount !== undefined) return `${r.sceneCount} scene(s)`;
  if (r.transcription) return `${r.transcription.substring(0, 60)}...`;
  if (r.highlights) return `${r.highlights.length} highlight(s)`;
  if (r.safe !== undefined) return r.safe ? 'Content safe' : 'Issues detected';
  if (r.url || r.s3Url) return 'Output ready';
  if (r.format) return r.format.toUpperCase();
  return 'Done';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ═══════════════════════════════════════════════════════════════════
// HISTORY TAB — All past video generation requests
// ═══════════════════════════════════════════════════════════════════

function HistoryTab({
  history,
  setHistory,
  onPreviewVideo,
  onNavigateToGenerate,
  onRestore,
  isGenerating,
}: {
  history: VideoHistoryItem[];
  setHistory: (updater: VideoHistoryItem[] | ((prev: VideoHistoryItem[]) => VideoHistoryItem[])) => void;
  onPreviewVideo?: (url: string, title: string) => void;
  onNavigateToGenerate: () => void;
  onRestore: (item: VideoHistoryItem) => void;
  isGenerating: boolean;
}) {
  const deleteItem = (id: string) => {
    setHistory(prev => prev.filter(x => x.id !== id));
  };

  const getStatusMeta = (item: VideoHistoryItem) => {
    if (item.status === 'PENDING') {
      const age = Date.now() - item.createdAt;
      if (age > 15 * 60 * 1000) return { label: 'Timed out', color: 'text-amber-400', bg: 'bg-amber-500/10', spin: false };
      return { label: 'Processing…', color: 'text-violet-400', bg: 'bg-violet-500/10', spin: true };
    }
    if (item.status === 'RUNNING') return { label: `${item.progress || 0}%`, color: 'text-violet-400', bg: 'bg-violet-500/10', spin: true };
    if (item.status === 'SUCCEEDED') return { label: 'Ready', color: 'text-green-400', bg: 'bg-green-500/10', spin: false };
    if (item.status === 'FAILED') return { label: 'Failed', color: 'text-primary-400', bg: 'bg-primary-500/10', spin: false };
    if (item.status === 'CANCELLED') return { label: 'Cancelled', color: 'text-white/30', bg: 'bg-white/5', spin: false };
    return { label: item.status, color: 'text-white/30', bg: 'bg-white/5', spin: false };
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Film size={40} className="text-white/15 mb-3" />
        <p className="text-sm text-white/50 font-medium mb-1">No videos yet</p>
        <p className="text-xs text-white/30 mb-5">
          Your generated videos will appear here with their status, preview, and download links.
        </p>
        <button
          onClick={onNavigateToGenerate}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Video size={14} />
          Generate a Video
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* List header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-canvas-border shrink-0">
        <span className="text-xs text-white/40">
          {history.length} request{history.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToGenerate}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Video size={11} />
            New
          </button>
          <button
            onClick={() => setHistory([])}
            className="text-xs text-white/25 hover:text-primary-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {history.map(item => {
          const st = getStatusMeta(item);
          return (
            <div
              key={item.id}
              className="group border-b border-canvas-border hover:bg-white/[0.025] transition-colors"
            >
              <div className="px-4 py-3 space-y-2">
                {/* Top row: status badge + time + delete */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>
                    {st.spin
                      ? <Loader2 size={9} className="animate-spin" />
                      : item.status === 'SUCCEEDED'
                        ? <Check size={9} />
                        : item.status === 'FAILED'
                          ? <X size={9} />
                          : <Clock size={9} />}
                    {st.label}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/25">{formatTimeAgo(item.createdAt)}</span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-0.5 rounded text-white/20 hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove from history"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <p className="text-xs text-white/75 leading-snug line-clamp-2">{item.prompt}</p>

                {/* Meta tags */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/30">
                  {item.mode && <span>{item.mode === 'text' ? 'Text → Video' : 'Image → Video'}</span>}
                  {item.ratio && <span>{item.ratio}</span>}
                  {item.duration && <span>{item.duration}s</span>}
                </div>

                {/* Error */}
                {item.error && (
                  <p className="text-[10px] text-primary-400/70 leading-snug">{item.error}</p>
                )}

                {/* Progress bar for in-progress */}
                {(item.status === 'PENDING' || item.status === 'RUNNING') && (
                  <div className="w-full bg-white/10 rounded-full h-0.5 overflow-hidden">
                    <div
                      className="bg-violet-500 h-0.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.progress || 0, 8)}%` }}
                    />
                  </div>
                )}

                {/* Action buttons */}
                {item.status === 'SUCCEEDED' && item.videoUrl && (
                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      onClick={() => onPreviewVideo?.(item.videoUrl!, item.prompt)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-violet-600/80 hover:bg-violet-600 rounded text-xs font-medium transition-colors"
                    >
                      <Play size={11} />
                      Preview
                    </button>
                    <a
                      href={item.videoUrl}
                      download={`video-${item.id}.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/10 hover:bg-white/15 rounded text-xs font-medium transition-colors"
                    >
                      <Download size={11} />
                      Download
                    </a>
                    <button
                      onClick={() => onRestore(item)}
                      className="flex items-center justify-center px-2 py-1.5 bg-white/[0.06] hover:bg-white/10 rounded text-white/40 hover:text-white/80 transition-colors"
                      title="Re-run this prompt"
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>
                )}
                {(item.status === 'FAILED' || item.status === 'CANCELLED' ||
                  (item.status === 'PENDING' && Date.now() - item.createdAt > 15 * 60 * 1000)) && (
                    <button
                      onClick={() => onRestore(item)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-violet-600/70 hover:bg-violet-600 rounded text-xs font-medium transition-colors"
                    >
                      <RefreshCw size={11} />
                      {isGenerating ? 'Open (will prompt to cancel)' : 'Retry in Generate tab'}
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
