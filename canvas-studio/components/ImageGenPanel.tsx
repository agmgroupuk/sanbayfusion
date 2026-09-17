import React, { useState } from 'react';

interface ImageGenPanelProps {
    onGenerated?: (imageUrl: string, prompt: string) => void;
}

const STYLE_PRESETS = [
    { id: 'photorealistic', label: 'Photorealistic' },
    { id: 'digital-art', label: 'Digital Art' },
    { id: 'illustration', label: 'Illustration' },
    { id: 'watercolor', label: 'Watercolor' },
    { id: 'oil-painting', label: 'Oil Painting' },
    { id: '3d-render', label: '3D Render' },
    { id: 'sketch', label: 'Sketch' },
    { id: 'anime', label: 'Anime' },
    { id: 'pixel-art', label: 'Pixel Art' },
    { id: 'minimalist', label: 'Minimalist' },
];

const SIZES = [
    { id: '1024x1024', label: '1:1 Square' },
    { id: '1792x1024', label: '16:9 Wide' },
    { id: '1024x1792', label: '9:16 Portrait' },
];

export default function ImageGenPanel({ onGenerated }: ImageGenPanelProps) {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('photorealistic');
    const [size, setSize] = useState('1024x1024');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<{ url: string; prompt: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generate = async () => {
        if (!prompt.trim() || generating) return;
        setGenerating(true);
        setError(null);
        setResult(null);
        try {
            const fullPrompt = style !== 'photorealistic' ? `${prompt}, ${style} style` : prompt;
            const res = await fetch('/api/canvas/agent-chat', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' },
                body: JSON.stringify({
                    message: `Use the generate_image tool to create an image: "${fullPrompt}". Size: ${size}.`,
                    provider: 'mistral',
                    modelId: 'mistral-large-latest',
                    conversationHistory: [],
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
            // Extract image URL from tool results
            const toolResult = data.toolResults?.find((t: any) => t.name === 'generate_image');
            const url = toolResult?.result?.url || toolResult?.result?.imageUrl || data.message?.match(/https?:\/\/\S+/)?.[0];
            if (url) {
                setResult({ url, prompt: fullPrompt });
                onGenerated?.(url, fullPrompt);
            } else {
                setError('Image generated but URL not found in response. Check the chat for the result.');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to generate image');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="p-6 space-y-5">
            {/* Prompt */}
            <div>
                <label className="block text-xs font-bold text-canvas-muted uppercase tracking-widest mb-2">
                    Image Description
                </label>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="A serene mountain lake at sunset with reflections in the water..."
                    rows={3}
                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
                />
            </div>

            {/* Style */}
            <div>
                <label className="block text-xs font-bold text-canvas-muted uppercase tracking-widest mb-2">
                    Style
                </label>
                <div className="flex flex-wrap gap-2">
                    {STYLE_PRESETS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setStyle(s.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${style === s.id
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                    : 'bg-black/30 border-gray-700 text-canvas-muted-deep hover:border-gray-600 hover:text-canvas-muted'
                                }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Size */}
            <div>
                <label className="block text-xs font-bold text-canvas-muted uppercase tracking-widest mb-2">
                    Size
                </label>
                <div className="flex gap-2">
                    {SIZES.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSize(s.id)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${size === s.id
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                    : 'bg-black/30 border-gray-700 text-canvas-muted-deep hover:border-gray-600'
                                }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate button */}
            <button
                onClick={generate}
                disabled={!prompt.trim() || generating}
                className="w-full py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
                {generating ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Generating...
                    </span>
                ) : '✨ Generate Image'}
            </button>

            {/* Error */}
            {error && (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg px-4 py-3 text-sm text-primary-400">
                    {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="space-y-3">
                    <img
                        src={result.url}
                        alt={result.prompt}
                        className="w-full rounded-lg border border-gray-700 object-cover"
                    />
                    <div className="flex gap-2">
                        <a
                            href={result.url}
                            download="generated-image.png"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 text-center text-xs font-medium bg-black/40 border border-gray-700 hover:border-cyan-500/40 text-canvas-muted hover:text-cyan-400 rounded-lg transition-all"
                        >
                            ⬇ Download
                        </a>
                        <button
                            onClick={() => setPrompt('')}
                            className="flex-1 py-2 text-xs font-medium bg-black/40 border border-gray-700 hover:border-gray-600 text-canvas-muted-deep hover:text-canvas-muted rounded-lg transition-all"
                        >
                            + New Image
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
