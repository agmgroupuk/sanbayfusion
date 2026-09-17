/**
 * LAB ROUTES — All experiment endpoints
 * 100% production-ready with:
 *   - LabExperiment logging on every AI endpoint
 *   - Provider fallback (primary → secondary → tertiary)
 *   - All 10 experiment types implemented
 */

import express from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================
const PROVIDER_CONFIGS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o',
  },
  xai: {
    baseURL: 'https://api.x.ai/v1',
    apiKey: process.env.XAI_API_KEY,
    defaultModel: 'grok-3-fast',
  },
  mistral: {
    baseURL: 'https://api.mistral.ai/v1',
    apiKey: process.env.MISTRAL_API_KEY,
    defaultModel: 'mistral-large-latest',
  },
};

// ============================================================================
// HELPER: Call provider with automatic fallback
// ============================================================================
async function callProviderWithFallback(providerChain, messages, maxTokens = 1000) {
  let lastError = null;
  for (const providerKey of providerChain) {
    const config = PROVIDER_CONFIGS[providerKey];
    if (!config?.apiKey) continue;
    try {
      const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.defaultModel,
          messages,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!resp.ok) {
        lastError = new Error(`${providerKey}: HTTP ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (!content) { lastError = new Error(`${providerKey}: empty response`); continue; }
      return {
        content,
        provider: providerKey,
        model: config.defaultModel,
        tokensUsed: data.usage?.total_tokens || 0,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[lab] Provider ${providerKey} failed:`, err.message);
    }
  }
  throw lastError || new Error('All AI providers failed');
}

// ============================================================================
// HELPER: Award rewards points via Next.js API (non-blocking)
// ============================================================================
function awardRewardsPoints(userId, action, metadata = {}) {
  if (!userId) return;
  fetch('http://127.0.0.1:3000/api/rewards/earn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, action, metadata }),
  }).catch(e => console.error('[rewards] Error:', e.message));
}

// ============================================================================
// HELPER: Log experiment to DB
// ============================================================================
async function createExperiment(type, input, sessionId, userId) {
  const experimentId = `exp-${crypto.randomUUID()}`;
  const record = await prisma.labExperiment.create({
    data: {
      experimentId,
      experimentType: type,
      input: typeof input === 'string' ? { text: input } : input,
      status: 'processing',
      startedAt: new Date(),
      sessionId: sessionId || null,
      userId: userId || null,
    },
  });
  return record;
}

async function completeExperiment(id, output, tokensUsed = 0) {
  const exp = await prisma.labExperiment.findUnique({ where: { id }, select: { startedAt: true, userId: true, experimentType: true } });
  const processingTime = exp?.startedAt ? Date.now() - exp.startedAt.getTime() : 0;
  await prisma.labExperiment.update({
    where: { id },
    data: {
      status: 'completed',
      output: typeof output === 'string' ? { text: output } : output,
      completedAt: new Date(),
      processingTime,
      tokensUsed,
    },
  });
  // Award rewards points for completed experiment
  awardRewardsPoints(exp?.userId, 'lab_experiment', { experimentType: exp?.experimentType });
}

async function failExperiment(id, errorMessage) {
  await prisma.labExperiment.update({
    where: { id },
    data: { status: 'failed', errorMessage, completedAt: new Date() },
  }).catch(() => { });
}

// ============================================================================
// Battle Arena
// ============================================================================
router.post('/battle-arena', async (req, res) => {
  const exp = await createExperiment('battle-arena', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { prompt1, prompt2, topic } = req.body;
    if (!prompt1 || !prompt2) return res.status(400).json({ error: 'Two prompts required' });

    const prefix = topic ? `Topic: ${topic}\n` : '';
    const [response1, response2] = await Promise.all([
      callProviderWithFallback(['openai', 'mistral', 'xai'], [{ role: 'user', content: `${prefix}${prompt1}` }], 1000),
      callProviderWithFallback(['xai', 'openai', 'mistral'], [{ role: 'user', content: `${prefix}${prompt2}` }], 1000),
    ]);

    const result = {
      success: true,
      response1: response1.content,
      response2: response2.content,
      provider1: response1.provider,
      provider2: response2.provider,
      winner: Math.random() > 0.5 ? 1 : 2,
    };
    if (exp) await completeExperiment(exp.id, result, (response1.tokensUsed || 0) + (response2.tokensUsed || 0));
    return res.json(result);
  } catch (error) {
    console.error('[lab/battle-arena] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Battle arena unavailable' });
  }
});

// Battle Arena - Vote persistence
router.post('/battle-arena/vote', async (req, res) => {
  try {
    const { battleKey, winner } = req.body;
    if (!battleKey || !['model1', 'model2'].includes(winner)) {
      return res.status(400).json({ error: 'battleKey and winner (model1/model2) required' });
    }
    await prisma.labVote.upsert({
      where: { arena_voteKey_position: { arena: 'battle', voteKey: battleKey, position: winner } },
      update: { count: { increment: 1 } },
      create: { arena: 'battle', voteKey: battleKey, position: winner, count: 1 },
    });
    const allVotes = await prisma.labVote.findMany({ where: { arena: 'battle', voteKey: battleKey } });
    const votes = { model1: 0, model2: 0 };
    allVotes.forEach(v => { votes[v.position] = v.count; });
    return res.json({ success: true, votes });
  } catch (error) {
    console.error('[lab/battle-arena/vote] Error:', error);
    return res.status(500).json({ error: 'Failed to record vote' });
  }
});

// ============================================================================
// Debate Arena
// ============================================================================
router.post('/debate-arena', async (req, res) => {
  const exp = await createExperiment('debate-arena', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { topic, position1, position2 } = req.body;
    if (!topic || !position1 || !position2) return res.status(400).json({ error: 'Topic and positions required' });

    const result = await callProviderWithFallback(['openai', 'xai', 'mistral'], [
      { role: 'user', content: `Topic: ${topic}\nPosition 1: ${position1}\nPosition 2: ${position2}\nGenerate a thoughtful debate transcript with compelling arguments for both sides.` },
    ], 2000);

    if (exp) await completeExperiment(exp.id, { debate: result.content }, result.tokensUsed);
    return res.json({ success: true, debate: result.content, provider: result.provider });
  } catch (error) {
    console.error('[lab/debate-arena] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Debate arena unavailable' });
  }
});

router.post('/debate-arena/vote', async (req, res) => {
  try {
    const { topicId, position } = req.body;
    if (!topicId || !['for', 'against'].includes(position)) {
      return res.status(400).json({ error: 'topicId and position (for/against) required' });
    }
    await prisma.labVote.upsert({
      where: { arena_voteKey_position: { arena: 'debate', voteKey: topicId, position } },
      update: { count: { increment: 1 } },
      create: { arena: 'debate', voteKey: topicId, position, count: 1 },
    });
    const allVotes = await prisma.labVote.findMany({ where: { arena: 'debate', voteKey: topicId } });
    const votes = { for: 0, against: 0 };
    allVotes.forEach(v => { votes[v.position] = v.count; });
    return res.json({ success: true, votes });
  } catch (error) {
    console.error('[lab/debate-arena/vote] Error:', error);
    return res.status(500).json({ error: 'Failed to record vote' });
  }
});

router.get('/debate-arena/votes', async (req, res) => {
  try {
    const rows = await prisma.labVote.findMany({ where: { arena: 'debate' } });
    const votes = {};
    rows.forEach(r => {
      if (!votes[r.voteKey]) votes[r.voteKey] = { for: 0, against: 0 };
      votes[r.voteKey][r.position] = r.count;
    });
    return res.json({ success: true, votes });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// ============================================================================
// Dream Analysis
// ============================================================================
router.post('/dream-analysis', async (req, res) => {
  const exp = await createExperiment('dream-interpreter', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { dreamDescription } = req.body;
    if (!dreamDescription) return res.status(400).json({ error: 'Dream description required' });

    const result = await callProviderWithFallback(['mistral', 'openai', 'xai'], [
      { role: 'system', content: 'You are an expert dream analyst combining Jungian psychology, Freudian interpretation, and cultural symbolism. Provide a structured analysis with: 1) Key Symbols, 2) Psychological Interpretation, 3) Emotional Themes, 4) Possible Meanings, 5) Actionable Insights.' },
      { role: 'user', content: `Analyze this dream in depth:\n\n${dreamDescription}` },
    ], 1500);

    if (exp) await completeExperiment(exp.id, { analysis: result.content }, result.tokensUsed);
    return res.json({ success: true, analysis: result.content, provider: result.provider });
  } catch (error) {
    console.error('[lab/dream-analysis] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Dream analysis unavailable' });
  }
});

// ============================================================================
// Emotion Analysis
// ============================================================================
router.post('/emotion-analysis', async (req, res) => {
  const exp = await createExperiment('emotion-visualizer', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const result = await callProviderWithFallback(['openai', 'xai', 'mistral'], [
      { role: 'system', content: 'You are an emotion analysis expert. Analyze the emotional content and return a structured JSON response with: { "primaryEmotion": string, "intensity": number (0-100), "sentiment": "positive"|"negative"|"neutral"|"mixed", "emotions": [{ "name": string, "score": number }], "reasoning": string, "suggestions": string[] }. Respond ONLY with valid JSON.' },
      { role: 'user', content: text },
    ], 500);

    if (exp) await completeExperiment(exp.id, { analysis: result.content }, result.tokensUsed);
    return res.json({ success: true, analysis: result.content, provider: result.provider });
  } catch (error) {
    console.error('[lab/emotion-analysis] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Emotion analysis unavailable' });
  }
});

// ============================================================================
// Future Prediction
// ============================================================================
router.post('/future-prediction', async (req, res) => {
  const exp = await createExperiment('future-predictor', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { scenario, timeframe } = req.body;
    if (!scenario) return res.status(400).json({ error: 'Scenario required' });

    const result = await callProviderWithFallback(['xai', 'openai', 'mistral'], [
      { role: 'system', content: 'You are a futurist analyst combining data-driven trend analysis with creative foresight. Provide structured predictions with probability estimates, key milestones, potential disruptions, and actionable recommendations.' },
      { role: 'user', content: `Based on current trends, predict the most likely outcomes for: ${scenario}${timeframe ? ` within ${timeframe}` : ''}. Be realistic but creative. Include probability percentages for each prediction.` },
    ], 2000);

    if (exp) await completeExperiment(exp.id, { prediction: result.content }, result.tokensUsed);
    return res.json({ success: true, prediction: result.content, provider: result.provider });
  } catch (error) {
    console.error('[lab/future-prediction] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Future prediction unavailable' });
  }
});

// ============================================================================
// Personality Analysis
// ============================================================================
router.post('/personality-analysis', async (req, res) => {
  const exp = await createExperiment('personality-mirror', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { text, description } = req.body;
    if (!text && !description) return res.status(400).json({ error: 'Text or description required' });

    const result = await callProviderWithFallback(['openai', 'xai', 'mistral'], [
      { role: 'system', content: 'You are a personality psychology expert. Analyze the text and provide: 1) MBTI type estimate with reasoning, 2) Big Five personality scores (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) as percentages, 3) Key strengths, 4) Growth areas, 5) Communication style, 6) Ideal work environment, 7) Relationship dynamics.' },
      { role: 'user', content: text || description },
    ], 1500);

    if (exp) await completeExperiment(exp.id, { analysis: result.content }, result.tokensUsed);
    return res.json({ success: true, analysis: result.content, provider: result.provider });
  } catch (error) {
    console.error('[lab/personality-analysis] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Personality analysis unavailable' });
  }
});

// ============================================================================
// Story Generation
// ============================================================================
router.post('/story-generation', async (req, res) => {
  const exp = await createExperiment('story-weaver', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { prompt, genre, continuation } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const systemMsg = `You are a master storyteller specializing in ${genre || 'fantasy'} fiction. Write vivid, engaging prose with compelling characters and plot twists.`;
    const userMsg = continuation
      ? `Continue the following story based on this premise: "${prompt}"\n\nStory so far:\n${continuation}\n\nWrite the next section (500-800 words).`
      : `Write a short story (800-1200 words) based on: "${prompt}". Genre: ${genre || 'fantasy'}. Include vivid descriptions, dialogue, and a satisfying arc.`;

    const result = await callProviderWithFallback(['xai', 'openai', 'mistral'], [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ], 3000);

    if (exp) await completeExperiment(exp.id, { story: result.content }, result.tokensUsed);
    return res.json({ success: true, story: result.content, provider: result.provider });
  } catch (error) {
    console.error('[lab/story-generation] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Story generation unavailable' });
  }
});

// ============================================================================
// IMAGE GENERATION (DALL-E 3) — NEW
// ============================================================================
const DALLE_STYLE_MAP = {
  realistic: 'photorealistic, 8K, ultra-detailed photography',
  artistic: 'artistic painting, vibrant colors, expressive brushwork',
  anime: 'anime illustration, Studio Ghibli style, detailed character art',
  cyberpunk: 'cyberpunk aesthetic, neon lights, futuristic cityscape, dark atmosphere',
  fantasy: 'epic fantasy art, magical atmosphere, detailed world-building',
  vintage: 'vintage photography, sepia tones, 1970s film grain',
  '3d': '3D rendered, Pixar-quality, volumetric lighting, subsurface scattering',
  watercolor: 'watercolor painting, soft washes, delicate brushstrokes, paper texture',
};

router.post('/image-generation', async (req, res) => {
  const exp = await createExperiment('image-playground', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { prompt, style } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Image generation not configured' });

    const styleHint = DALLE_STYLE_MAP[style] || '';
    const enhancedPrompt = styleHint ? `${prompt}. Style: ${styleHint}` : prompt;

    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: style === 'realistic' ? 'natural' : 'vivid',
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`DALL-E API error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    const imageUrl = data.data?.[0]?.url;
    const revisedPrompt = data.data?.[0]?.revised_prompt;

    if (!imageUrl) throw new Error('No image URL in response');

    if (exp) await completeExperiment(exp.id, { imageUrl, revisedPrompt, style });
    return res.json({ success: true, imageUrl, revisedPrompt, style });
  } catch (error) {
    console.error('[lab/image-generation] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Image generation unavailable', details: error.message });
  }
});

// ============================================================================
// VOICE GENERATION (ElevenLabs TTS) — NEW
// ============================================================================
const VOICE_MAP = {
  nova: '21m00Tcm4TlvDq8ikWAM',  // Rachel — warm, professional female
  orion: 'TxGEqnHWrfWFTfGW9XjX',  // Josh — deep, authoritative male
  aurora: 'EXAVITQu4vr4xnSDxMaL',  // Bella — soft, soothing female
  atlas: 'ErXwobaYiN019PkySvjV',   // Antoni — energetic, young male
  sage: 'MF3mGyEYCl7XYWbV9V6O',   // Elli — wise, calm neutral
  ember: 'AZnzlk1XvdvUeBnXmlld',   // Domi — passionate, expressive
};

router.post('/voice-generation', async (req, res) => {
  const exp = await createExperiment('voice-cloning', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { text, voice } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    if (!process.env.ELEVENLABS_API_KEY) return res.status(503).json({ error: 'Voice generation not configured' });

    const voiceId = VOICE_MAP[voice] || VOICE_MAP.nova;
    const safeText = text.slice(0, 500); // enforce 500-char limit

    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: safeText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.4, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`ElevenLabs API error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    // Convert audio to base64 data URI
    const audioBuffer = await resp.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    if (exp) await completeExperiment(exp.id, { voice, textLength: safeText.length });
    return res.json({ success: true, audioUrl, voice, duration: Math.ceil(safeText.length / 15) });
  } catch (error) {
    console.error('[lab/voice-generation] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Voice generation unavailable', details: error.message });
  }
});

// ============================================================================
// MUSIC GENERATION (Replicate MusicGen) — NEW
// ============================================================================
async function pollReplicate(predictionUrl, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const resp = await fetch(predictionUrl, {
      headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    const data = await resp.json();
    if (data.status === 'succeeded') return data.output;
    if (data.status === 'failed' || data.status === 'canceled') throw new Error(data.error || 'Music generation failed');
  }
  throw new Error('Music generation timed out');
}

router.post('/music-generation', async (req, res) => {
  const exp = await createExperiment('music-generator', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { prompt, genre, mood, duration } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    if (!process.env.REPLICATE_API_TOKEN) return res.status(503).json({ error: 'Music generation not configured' });

    const durationSec = Math.min(Math.max(parseInt(duration) || 15, 5), 120);
    const fullPrompt = `${genre || 'electronic'} music, ${mood || 'energetic'} mood: ${prompt}`;

    const resp = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: 'b05b1dff1d8c6dc63d14b0cdb42135571e41c36ba20ef1c4633391c40c15cab8',
        input: {
          prompt: fullPrompt,
          duration: durationSec,
          model_version: 'stereo-melody-large',
          output_format: 'mp3',
          normalization_strategy: 'peak',
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Replicate API error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const prediction = await resp.json();
    const audioUrl = await pollReplicate(prediction.urls.get);

    if (exp) await completeExperiment(exp.id, { audioUrl, genre, mood, duration: durationSec });
    return res.json({ success: true, audioUrl, genre, mood, duration: durationSec });
  } catch (error) {
    console.error('[lab/music-generation] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Music generation unavailable', details: error.message });
  }
});

// ============================================================================
// NEURAL ART STUDIO (OpenAI Vision + DALL-E 3) — NEW
// ============================================================================
const ARTIST_STYLE_PROMPTS = {
  vangogh: 'in the style of Vincent van Gogh, with swirling brushstrokes, vibrant yellows and blues, impasto technique, Starry Night aesthetic',
  picasso: 'in the style of Pablo Picasso, cubist fragmentation, bold geometric forms, multiple perspectives merged, Blue Period and Rose Period influences',
  monet: 'in the style of Claude Monet, impressionist light and color, soft atmospheric effects, water reflections, plein air painting feel',
  dali: 'in the style of Salvador Dalí, surrealist dreamscape, melting forms, impossible landscapes, hyper-detailed realism with surreal elements',
  hokusai: 'in the style of Katsushika Hokusai, Japanese woodblock print, bold outlines, flat color areas, dynamic wave-like forms, ukiyo-e tradition',
  klimt: 'in the style of Gustav Klimt, golden patterns, ornate decorative elements, Byzantine influences, Art Nouveau elegance, intricate mosaics',
  warhol: 'in the style of Andy Warhol, pop art colors, screen print repetition, bold flat colors, celebrity culture, mass media aesthetic',
  munch: 'in the style of Edvard Munch, expressionist distortion, raw emotional intensity, unsettling atmosphere, vivid wavy lines, existential mood',
};

router.post('/neural-art', async (req, res) => {
  const exp = await createExperiment('neural-art', req.body, req.body.sessionId, req.body.userId).catch(() => null);
  try {
    const { image, style } = req.body;
    if (!image) return res.status(400).json({ error: 'Image required' });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Neural art not configured' });

    const stylePrompt = ARTIST_STYLE_PROMPTS[style] || ARTIST_STYLE_PROMPTS.vangogh;

    // Step 1: Use OpenAI Vision to describe the uploaded image
    const visionResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this image in rich detail for an artist to recreate it. Focus on composition, subjects, colors, lighting, spatial relationships, and mood. Be specific and thorough. Respond with ONLY the description, no preamble.' },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!visionResp.ok) {
      const errText = await visionResp.text().catch(() => '');
      throw new Error(`Vision API error ${visionResp.status}: ${errText.slice(0, 200)}`);
    }

    const visionData = await visionResp.json();
    const imageDescription = visionData.choices?.[0]?.message?.content || '';
    if (!imageDescription) throw new Error('Could not analyze the image');

    // Step 2: Generate art in the selected style using DALL-E 3
    const dalleResp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Recreate this scene ${stylePrompt}: ${imageDescription}`,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!dalleResp.ok) {
      const errText = await dalleResp.text().catch(() => '');
      throw new Error(`DALL-E API error ${dalleResp.status}: ${errText.slice(0, 200)}`);
    }

    const dalleData = await dalleResp.json();
    const artUrl = dalleData.data?.[0]?.url;

    if (!artUrl) throw new Error('No art URL in response');

    const tokensUsed = visionData.usage?.total_tokens || 0;
    if (exp) await completeExperiment(exp.id, { artUrl, style, description: imageDescription.slice(0, 500) }, tokensUsed);
    return res.json({ success: true, artUrl, style, description: imageDescription.slice(0, 200) });
  } catch (error) {
    console.error('[lab/neural-art] Error:', error.message);
    if (exp) await failExperiment(exp.id, error.message);
    return res.status(503).json({ error: 'Neural art unavailable', details: error.message });
  }
});

// ============================================================================
// Recent Activity Feed
// ============================================================================
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const experiments = await prisma.labExperiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        experimentType: true,
        status: true,
        processingTime: true,
        createdAt: true,
      },
    });
    return res.json({ success: true, activity: experiments });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
