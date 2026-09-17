// Video Editor Service — Types and presets

export interface VideoPresetStep {
    tool?: string;
    action: string;
    params?: Record<string, unknown>;
}

export interface VideoPreset {
    id: string;
    name: string;
    description: string;
    prompt: string;
    icon: string;
    category: string;
    steps: VideoPresetStep[];
}

export interface VideoToolCall {
    id: string;
    tool: string;
    action: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    params: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
}

export const VIDEO_PRESETS: VideoPreset[] = [
    {
        id: 'cinematic',
        name: 'Cinematic Look',
        description: 'Apply dramatic cinematic color grading',
        prompt: 'Apply cinematic color grading with warm shadows and cool highlights',
        icon: '🎬',
        category: 'style',
        steps: [
            { tool: 'video_filter', action: 'color_grade', params: { style: 'cinematic' } },
            { tool: 'video_filter', action: 'vignette', params: { intensity: 0.3 } },
        ],
    },
    {
        id: 'slow-mo',
        name: 'Slow Motion',
        description: 'Create smooth slow motion effect',
        prompt: 'Apply slow motion effect at 0.5x speed with frame interpolation',
        icon: '🐌',
        category: 'speed',
        steps: [
            { tool: 'video_transform', action: 'slow_motion', params: { speed: 0.5 } },
        ],
    },
    {
        id: 'vintage',
        name: 'Vintage Film',
        description: 'Retro film grain and color shift',
        prompt: 'Apply vintage film effect with grain, vignette, and warm tones',
        icon: '📽️',
        category: 'style',
        steps: [
            { tool: 'video_filter', action: 'grain', params: { amount: 0.4 } },
            { tool: 'video_filter', action: 'color_shift', params: { warmth: 0.6 } },
        ],
    },
    {
        id: 'timelapse',
        name: 'Timelapse',
        description: 'Speed up footage into a timelapse',
        prompt: 'Speed up to 8x with smooth transitions for timelapse effect',
        icon: '⏩',
        category: 'speed',
        steps: [
            { tool: 'video_transform', action: 'speed_up', params: { factor: 8 } },
        ],
    },
    {
        id: 'stabilize',
        name: 'Stabilize',
        description: 'Remove camera shake',
        prompt: 'Stabilize the video to remove camera shake and jitter',
        icon: '📐',
        category: 'fix',
        steps: [
            { tool: 'video_transform', action: 'stabilize', params: {} },
        ],
    },
    {
        id: 'subtitles',
        name: 'Auto Subtitles',
        description: 'Generate and burn in subtitles',
        prompt: 'Transcribe audio and add styled subtitles',
        icon: '💬',
        category: 'text',
        steps: [
            { tool: 'video_ai', action: 'transcribe', params: {} },
            { tool: 'video_overlay', action: 'subtitles', params: { style: 'default' } },
        ],
    },
];
