import { useState, useCallback, useRef } from 'react';
import type { VideoPreset, VideoToolCall } from '../services/videoEditorService';

export interface VideoSourceMetadata {
    duration: number;
    durationFormatted: string;
    size: number;
    width: number;
    height: number;
    format: string;
    fps?: number;
    codec?: string;
}

export interface VideoOutputFile {
    filename: string;
    label: string;
    format: string;
    size?: number;
    url: string;
}

export interface VideoProject {
    name: string;
    sourceMetadata: VideoSourceMetadata | null;
    outputFiles: VideoOutputFile[];
}

export interface VideoPlan {
    status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
    interpretation: string;
    userPrompt: string;
    steps: VideoToolCall[];
}

type TabId = 'history' | 'generate' | 'upload' | 'edit' | 'presets' | 'timeline' | 'export';

export function useVideoEditor(_userId?: string) {
    const [project, setProject] = useState<VideoProject | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('history');
    const [activePlan, setActivePlan] = useState<VideoPlan | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const cancelledRef = useRef(false);

    const uploadVideo = useCallback(async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const url = await new Promise<string>((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/assets/upload');
                xhr.withCredentials = true;

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve(data.asset?.url || data.url || URL.createObjectURL(file));
                        } catch {
                            resolve(URL.createObjectURL(file));
                        }
                    } else {
                        resolve(URL.createObjectURL(file));
                    }
                };

                xhr.onerror = () => resolve(URL.createObjectURL(file));
                xhr.send(formData);
            });

            const ext = file.name.split('.').pop() || 'mp4';
            setProject({
                name: file.name,
                sourceMetadata: {
                    duration: 0,
                    durationFormatted: '0:00',
                    size: file.size,
                    width: 1920,
                    height: 1080,
                    format: ext,
                },
                outputFiles: [],
            });
            setPreviewUrl(url);
            setActiveTab('edit');
        } finally {
            setIsUploading(false);
        }
    }, []);

    const loadVideo = useCallback((url: string, name?: string) => {
        setProject({
            name: name || 'Loaded Video',
            sourceMetadata: {
                duration: 0,
                durationFormatted: '0:00',
                size: 0,
                width: 1920,
                height: 1080,
                format: 'mp4',
            },
            outputFiles: [],
        });
        setPreviewUrl(url);
    }, []);

    const planEdit = useCallback(async (prompt: string) => {
        setIsPlanning(true);
        try {
            const resp = await fetch('/api/video/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    prompt,
                    sourceMetadata: project?.sourceMetadata || null,
                }),
            });

            const data = await resp.json();

            if (data.success && data.steps?.length) {
                setActivePlan({
                    status: 'planning',
                    interpretation: data.interpretation || `Plan for: ${prompt}`,
                    userPrompt: prompt,
                    steps: data.steps.map((s: Record<string, unknown>, i: number) => ({
                        id: (s.id as string) || String(i + 1),
                        tool: s.tool as string,
                        action: s.action as string,
                        status: 'pending' as const,
                        params: (s.params as Record<string, unknown>) || {},
                    })),
                });
            } else {
                setActivePlan({
                    status: 'failed',
                    interpretation: (data.error as string) || `Could not generate plan for: ${prompt}`,
                    userPrompt: prompt,
                    steps: [],
                });
            }
            setActiveTab('timeline');
        } catch {
            setActivePlan({
                status: 'failed',
                interpretation: 'Failed to generate plan — server unreachable',
                userPrompt: prompt,
                steps: [],
            });
            setActiveTab('timeline');
        } finally {
            setIsPlanning(false);
        }
    }, [project]);

    const applyPreset = useCallback((preset: VideoPreset) => {
        setActivePlan({
            status: 'planning',
            interpretation: `Applying preset: ${preset.name}`,
            userPrompt: preset.name,
            steps: preset.steps.map((s, i) => ({
                id: String(i + 1),
                tool: s.tool || 'video_transform',
                action: s.action,
                status: 'pending' as const,
                params: s.params || {},
            })),
        });
        setActiveTab('timeline');
    }, []);

    const executePlan = useCallback(async () => {
        if (!activePlan || activePlan.steps.length === 0) return;
        cancelledRef.current = false;

        const steps: VideoToolCall[] = activePlan.steps.map((s) => ({ ...s }));
        setActivePlan({ ...activePlan, status: 'executing', steps });

        for (let i = 0; i < steps.length; i++) {
            if (cancelledRef.current) {
                for (let j = i; j < steps.length; j++) {
                    steps[j] = { ...steps[j], status: 'skipped' };
                }
                setActivePlan((prev) => prev ? { ...prev, status: 'cancelled', steps: [...steps] } : null);
                return;
            }

            steps[i] = { ...steps[i], status: 'running' };
            setActivePlan((prev) => prev ? { ...prev, steps: [...steps] } : null);

            try {
                const resp = await fetch('/api/video/execute-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        tool: steps[i].tool,
                        action: steps[i].action,
                        params: steps[i].params,
                    }),
                });

                const data = await resp.json();

                if (data.success) {
                    steps[i] = { ...steps[i], status: 'completed', result: data.result };
                } else {
                    steps[i] = { ...steps[i], status: 'failed', error: data.error || 'Step failed' };
                    for (let j = i + 1; j < steps.length; j++) {
                        steps[j] = { ...steps[j], status: 'skipped' };
                    }
                    setActivePlan((prev) => prev ? { ...prev, status: 'failed', steps: [...steps] } : null);
                    return;
                }
            } catch {
                steps[i] = { ...steps[i], status: 'failed', error: 'Network error' };
                for (let j = i + 1; j < steps.length; j++) {
                    steps[j] = { ...steps[j], status: 'skipped' };
                }
                setActivePlan((prev) => prev ? { ...prev, status: 'failed', steps: [...steps] } : null);
                return;
            }

            setActivePlan((prev) => prev ? { ...prev, steps: [...steps] } : null);
        }

        setActivePlan((prev) => prev ? { ...prev, status: 'completed' } : null);
    }, [activePlan]);

    const cancelExecution = useCallback(() => {
        if (!activePlan) return;
        cancelledRef.current = true;
        setActivePlan((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    }, [activePlan]);

    return {
        project,
        activeTab,
        activePlan,
        isPlanning,
        isUploading,
        uploadProgress,
        previewUrl,
        setActiveTab,
        setPreviewUrl,
        uploadVideo,
        loadVideo,
        planEdit,
        applyPreset,
        executePlan,
        cancelExecution,
    };
}
