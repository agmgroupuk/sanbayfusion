/**
 * ttsService — Text-to-Speech via ElevenLabs
 * Wraps POST /api/tts endpoint
 */

const API_BASE = '/api/tts';

export const ttsService = {
    /** Generate speech audio from text */
    async synthesize(text: string, voiceId: string): Promise<Response> {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text.slice(0, 5000), // Limit text length
                voiceId,
            }),
        });
        return res;
    },
};

export default ttsService;
