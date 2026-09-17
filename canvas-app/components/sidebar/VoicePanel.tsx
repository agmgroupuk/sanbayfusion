/**
 * VoicePanel — Advanced voice input sidebar panel
 * Features:
 *  - Real-time speech-to-text (Web Speech API)
 *  - Animated live waveform bars
 *  - Language selector (20+ locales)
 *  - Continuous vs one-shot mode
 *  - Editable live transcript
 *  - "Send to Chat" & "Generate Code" actions
 *  - Persistent session history with copy / re-use / delete
 *  - Clear-all history
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { userHistoryService } from '../../services/userHistoryService';
import {
    Mic,
    MicOff,
    Volume2,
    MessageSquare,
    Sparkles,
    Copy,
    Check,
    Trash2,
    Clock,
    ChevronDown,
    AlertCircle,
    Play,
    Square,
    Languages,
    RefreshCw,
    X,
    Repeat,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────
interface VoiceHistoryItem {
    id: string;
    text: string;
    language: string;
    timestamp: number;
    action: 'chat' | 'generate' | 'copy' | 'saved';
}

interface VoicePanelProps {
    /** Called when user sends voice text to the AI chat */
    onSendToChat: (text: string) => void;
    /** Called when user wants to generate code from voice text */
    onGenerateCode: (text: string) => void;
}

// ──────────────────────────────────────────────────────────────────
// Supported languages
// ──────────────────────────────────────────────────────────────────
const LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'en-AU', label: 'English (AU)' },
    { code: 'es-ES', label: 'Spanish (ES)' },
    { code: 'es-MX', label: 'Spanish (MX)' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'pt-BR', label: 'Portuguese (BR)' },
    { code: 'pt-PT', label: 'Portuguese (PT)' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'zh-TW', label: 'Chinese (Traditional)' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'ko-KR', label: 'Korean' },
    { code: 'ar-SA', label: 'Arabic' },
    { code: 'hi-IN', label: 'Hindi' },
    { code: 'ru-RU', label: 'Russian' },
    { code: 'nl-NL', label: 'Dutch' },
    { code: 'pl-PL', label: 'Polish' },
    { code: 'tr-TR', label: 'Turkish' },
];


// ──────────────────────────────────────────────────────────────────
// Waveform bars (pure CSS animation driven by volume)
// ──────────────────────────────────────────────────────────────────
const BAR_COUNT = 20;
const WaveformBars: React.FC<{ volume: number; isListening: boolean }> = ({ volume, isListening }) => (
    <div className="flex items-end justify-center gap-0.5 h-10">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
            const seed = Math.sin(i * 1.3) * 0.5 + 0.5;
            const heightPct = isListening ? Math.max(6, Math.round(seed * volume * 95 + (volume > 0.05 ? 6 : 3))) : 4;
            return (
                <div
                    key={i}
                    className="w-1 rounded-full transition-all"
                    style={{
                        height: `${heightPct}%`,
                        backgroundColor: isListening
                            ? `rgba(34,211,238,${0.4 + seed * 0.6})`
                            : 'rgba(255,255,255,0.1)',
                        transition: 'height 0.08s ease-out',
                    }}
                />
            );
        })}
    </div>
);

// ──────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────
const SpeechRecognitionAPI =
    typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

const VoicePanel: React.FC<VoicePanelProps> = ({ onSendToChat, onGenerateCode }) => {
    // ── Tabs ──────────────────────────────────────────────────────
    const [tab, setTab] = useState<'record' | 'history'>('record');

    // ── Recognition state ─────────────────────────────────────────
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState(0);
    const [language, setLanguage] = useState('en-US');
    const [continuous, setContinuous] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);

    // ── Feedback ──────────────────────────────────────────────────
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // ── History ───────────────────────────────────────────────────
    const [history, setHistory] = useState<VoiceHistoryItem[]>([]);

    // Hydrate history from DB on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await userHistoryService.list<VoiceHistoryItem>('voice', 100);
            if (cancelled || !res.success || !res.items) return;
            setHistory(res.items.map((row) => ({ ...(row.data as VoiceHistoryItem), id: row.id })));
        })();
        return () => { cancelled = true; };
    }, []);

    // ── Refs ──────────────────────────────────────────────────────
    const recognitionRef = useRef<any>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);

    // ── Close lang menu on outside click ─────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
                setShowLangMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Build (or rebuild) recognition when language/continuous changes ─
    const buildRecognition = useCallback(() => {
        if (!SpeechRecognitionAPI) return null;
        const r = new SpeechRecognitionAPI();
        r.continuous = continuous;
        r.interimResults = true;
        r.lang = language;
        r.maxAlternatives = 1;

        r.onstart = () => { setIsListening(true); setError(null); };
        r.onend = () => { setIsListening(false); stopMic(); };
        r.onerror = (e: any) => {
            setIsListening(false);
            stopMic();
            const msg: Record<string, string> = {
                'not-allowed': 'Microphone access denied — please allow mic permissions.',
                'no-speech': 'No speech detected. Try again.',
                'network': 'Network error. Check your connection.',
                'aborted': '',
            };
            setError(msg[e.error] ?? `Recognition error: ${e.error}`);
        };
        r.onresult = (e: any) => {
            let final = '';
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const part = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += part;
                else interim += part;
            }
            if (final) {
                setTranscript(prev => (prev ? prev + ' ' + final : final).trim());
                setInterimText('');
            } else {
                setInterimText(interim);
            }
        };
        return r;
    }, [language, continuous]);

    // ── Volume analysis ───────────────────────────────────────────
    const startMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioCtxRef.current = new AudioContext();
            analyserRef.current = audioCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 64;
            const src = audioCtxRef.current.createMediaStreamSource(stream);
            src.connect(analyserRef.current);
            const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
            const tick = () => {
                analyserRef.current!.getByteFrequencyData(buf);
                const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
                setVolume(avg / 255);
                rafRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch {
            /* mic permission already handled by recognition.onerror */
        }
    };

    const stopMic = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        audioCtxRef.current?.close().catch(() => { });
        audioCtxRef.current = null;
        analyserRef.current = null;
        setVolume(0);
    };

    // ── Toggle listening ──────────────────────────────────────────
    const toggleListening = async () => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }
        setTranscript('');
        setInterimText('');
        setError(null);
        recognitionRef.current = buildRecognition();
        if (!recognitionRef.current) { setError('Voice input is not supported in this browser.'); return; }
        try {
            recognitionRef.current.start();
            await startMic();
        } catch {
            setError('Failed to start microphone.');
        }
    };

    // Cleanup on unmount
    useEffect(() => () => {
        recognitionRef.current?.stop();
        stopMic();
    }, []);

    // ── Helpers ───────────────────────────────────────────────────
    const addToHistory = (text: string, action: VoiceHistoryItem['action']) => {
        const item: VoiceHistoryItem = { id: Date.now().toString(), text, language, timestamp: Date.now(), action };
        setHistory(prev => [item, ...prev].slice(0, 100));
        userHistoryService.create<VoiceHistoryItem>('voice', item, item.id);
    };

    const clearTranscript = () => { setTranscript(''); setInterimText(''); setError(null); };

    const copyText = async (text: string, markId: string) => {
        await navigator.clipboard.writeText(text).catch(() => { });
        setCopiedId(markId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSendToChat = () => {
        if (!transcript.trim()) return;
        onSendToChat(transcript.trim());
        addToHistory(transcript.trim(), 'chat');
        clearTranscript();
    };

    const handleGenerateCode = () => {
        if (!transcript.trim()) return;
        onGenerateCode(transcript.trim());
        addToHistory(transcript.trim(), 'generate');
        clearTranscript();
    };

    const handleSave = () => {
        if (!transcript.trim()) return;
        addToHistory(transcript.trim(), 'saved');
    };

    const deleteItem = (id: string) => {
        setHistory(prev => prev.filter(h => h.id !== id));
        userHistoryService.remove('voice', id);
    };

    const clearAll = () => {
        setHistory([]);
        userHistoryService.clear('voice');
    };

    const actionLabel: Record<VoiceHistoryItem['action'], string> = {
        chat: 'Sent to Chat',
        generate: 'Generated Code',
        copy: 'Copied',
        saved: 'Saved',
    };
    const actionColor: Record<VoiceHistoryItem['action'], string> = {
        chat: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        generate: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        copy: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        saved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };

    const hasTranscript = transcript.trim().length > 0;
    const fullPreview = hasTranscript ? transcript + (interimText ? ' ' + interimText : '') : interimText;
    const langLabel = LANGUAGES.find(l => l.code === language)?.label ?? language;

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-canvas-card text-white">

            {/* ── Header ── */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-canvas-border shrink-0">
                <Mic size={18} className="text-cyan-400" />
                <span className="font-semibold text-sm">Voice Input</span>
                <span className="ml-auto text-[10px] text-white/20">Speech API</span>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-0.5 p-2 border-b border-canvas-border shrink-0">
                <button
                    onClick={() => setTab('record')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${tab === 'record' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
                >
                    Record
                </button>
                <button
                    onClick={() => setTab('history')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${tab === 'history' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
                >
                    History{history.length > 0 ? ` (${history.length})` : ''}
                </button>
            </div>

            {/* ══════════════ RECORD TAB ══════════════ */}
            {tab === 'record' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">

                    {/* Language selector */}
                    <div className="relative" ref={langMenuRef}>
                        <button
                            onClick={() => setShowLangMenu(p => !p)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-canvas-border hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Languages size={13} className="text-cyan-400/70 shrink-0" />
                                <span className="text-[11px] text-white/60">{langLabel}</span>
                            </div>
                            <ChevronDown size={12} className={`text-white/30 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showLangMenu && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-canvas-card border border-canvas-border rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                                {LANGUAGES.map(l => (
                                    <button
                                        key={l.code}
                                        onClick={() => { setLanguage(l.code); setShowLangMenu(false); }}
                                        className={`w-full text-left px-3 py-2 text-[11px] transition-colors hover:bg-cyan-500/10 hover:text-cyan-300 ${language === l.code ? 'bg-cyan-500/15 text-cyan-300 font-semibold' : 'text-white/50'}`}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Continuous mode toggle */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-canvas-border">
                        <div className="flex items-center gap-2">
                            <Repeat size={12} className="text-white/30" />
                            <span className="text-[11px] text-white/50">Continuous mode</span>
                        </div>
                        <button
                            onClick={() => setContinuous(p => !p)}
                            className={`relative w-9 h-5 rounded-full transition-all ${continuous ? 'bg-cyan-500/70' : 'bg-white/10'}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${continuous ? 'left-4' : 'left-0.5'}`} />
                        </button>
                    </div>

                    {/* Main mic button + waveform */}
                    <div className="flex flex-col items-center gap-4 py-5 rounded-2xl bg-white/[0.02] border border-canvas-border">
                        {/* Waveform */}
                        <WaveformBars volume={volume} isListening={isListening} />

                        {/* Mic button */}
                        <button
                            onClick={toggleListening}
                            disabled={!SpeechRecognitionAPI}
                            className={`relative p-5 rounded-full transition-all shadow-xl ${isListening
                                    ? 'bg-primary-500 hover:bg-primary-600 shadow-primary-900/30'
                                    : !SpeechRecognitionAPI
                                        ? 'bg-white/[0.06] cursor-not-allowed opacity-40'
                                        : 'bg-gradient-to-br from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 shadow-cyan-900/30'
                                }`}
                        >
                            {isListening && (
                                <span
                                    className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-40"
                                    style={{ animationDuration: '1.2s' }}
                                />
                            )}
                            {isListening
                                ? <Square size={22} className="text-white relative z-10 fill-white" />
                                : <Mic size={22} className="text-white relative z-10" />
                            }
                        </button>

                        {/* Status */}
                        <p className={`text-xs font-medium transition-colors ${error ? 'text-primary-400' :
                                isListening ? 'text-primary-400 animate-pulse' :
                                    'text-white/30'
                            }`}>
                            {error
                                ? error
                                : isListening
                                    ? `Listening${continuous ? ' (continuous)' : ''}…`
                                    : SpeechRecognitionAPI
                                        ? 'Tap the mic to start'
                                        : 'Voice input not supported in this browser'}
                        </p>
                    </div>

                    {/* Unsupported browser notice */}
                    {!SpeechRecognitionAPI && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <AlertCircle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-amber-300 leading-relaxed">
                                Web Speech API is not available. Use Chrome, Edge, or Safari for voice input.
                            </p>
                        </div>
                    )}

                    {/* Live transcript */}
                    {(fullPreview || interimText) && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Transcript</span>
                                <button onClick={clearTranscript} className="text-[10px] text-white/25 hover:text-primary-400 transition-colors flex items-center gap-1">
                                    <X size={10} />Clear
                                </button>
                            </div>
                            <textarea
                                value={transcript}
                                onChange={e => setTranscript(e.target.value)}
                                placeholder="Your speech will appear here…"
                                rows={4}
                                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-canvas-border focus:border-cyan-500/40 focus:bg-cyan-500/[0.03] outline-none text-sm text-white/80 placeholder-white/20 resize-none leading-relaxed transition-all"
                            />
                            {interimText && (
                                <p className="text-[11px] text-cyan-400/50 italic px-1 -mt-1">{interimText}</p>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    {hasTranscript && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleSendToChat}
                                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/25 text-xs font-semibold text-cyan-300 transition-all"
                                >
                                    <MessageSquare size={13} />Send to Chat
                                </button>
                                <button
                                    onClick={handleGenerateCode}
                                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/25 text-xs font-semibold text-violet-300 transition-all"
                                >
                                    <Sparkles size={13} />Generate Code
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => copyText(transcript, 'live')}
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-canvas-border text-[11px] font-medium text-white/45 hover:text-white/70 transition-all"
                                >
                                    {copiedId === 'live' ? <><Check size={11} className="text-emerald-400" />Copied!</> : <><Copy size={11} />Copy Text</>}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-canvas-border text-[11px] font-medium text-white/45 hover:text-white/70 transition-all"
                                >
                                    <Clock size={11} />Save to History
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tips */}
                    <div className="rounded-xl bg-white/[0.02] border border-canvas-border p-3 space-y-1.5">
                        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-1">Tips</p>
                        {[
                            'Speak clearly at a normal pace',
                            'Describe layouts, features, and colors',
                            'Use "Send to Chat" to start a conversation',
                            'Use "Generate Code" to directly build',
                            'Edit the transcript before sending',
                        ].map(tip => (
                            <p key={tip} className="text-[10px] text-white/25 leading-relaxed flex gap-1.5">
                                <span className="text-cyan-500/40 shrink-0">›</span>{tip}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════════ HISTORY TAB ══════════════ */}
            {tab === 'history' && (
                <div className="flex-1 overflow-y-auto p-3">
                    {history.length === 0 ? (
                        <div className="text-center py-14 text-white/25">
                            <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">No recordings yet</p>
                            <p className="text-[11px] mt-1 text-white/15">Use the mic to capture your voice</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map(item => (
                                <div key={item.id} className="rounded-xl border border-canvas-border bg-white/[0.02] p-3 space-y-2.5">
                                    {/* Meta row */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${actionColor[item.action]}`}>
                                                {actionLabel[item.action]}
                                            </span>
                                            <span className="text-[9px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded-full border border-canvas-border">
                                                {LANGUAGES.find(l => l.code === item.language)?.label?.split(' ')[0] ?? item.language}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            className="p-1 rounded-md text-white/15 hover:text-primary-400 hover:bg-primary-500/10 transition-all shrink-0"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>

                                    {/* Text */}
                                    <p className="text-[12px] text-white/65 leading-relaxed line-clamp-4">{item.text}</p>

                                    {/* Timestamp */}
                                    <p className="text-[10px] text-white/20">{new Date(item.timestamp).toLocaleString()}</p>

                                    {/* Actions */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                            onClick={() => { onSendToChat(item.text); addToHistory(item.text, 'chat'); }}
                                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-[10px] font-semibold text-cyan-400 transition-all"
                                        >
                                            <MessageSquare size={10} />Chat
                                        </button>
                                        <button
                                            onClick={() => { onGenerateCode(item.text); addToHistory(item.text, 'generate'); }}
                                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-[10px] font-semibold text-violet-400 transition-all"
                                        >
                                            <Sparkles size={10} />Build
                                        </button>
                                        <button
                                            onClick={() => copyText(item.text, item.id)}
                                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-canvas-border text-[10px] font-medium text-white/40 hover:text-white/70 transition-all"
                                        >
                                            {copiedId === item.id ? <><Check size={10} className="text-emerald-400" />Done</> : <><Copy size={10} />Copy</>}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={clearAll}
                                className="w-full mt-1 py-2 text-[11px] font-medium text-white/20 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all flex items-center justify-center gap-1.5"
                            >
                                <Trash2 size={11} />Clear All History
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VoicePanel;
