/**
 * STS (Speech-to-Speech) ROUTES
 * =============================
 * Backend API routes for real-time voice communication with agents
 * 
 * Endpoints:
 * - POST /api/realtime/session - Create ephemeral session token
 * - POST /api/tts/elevenlabs - ElevenLabs TTS synthesis
 * - POST /api/tts/lmnt - LMNT TTS synthesis (ultra-low latency)
 */

import express from 'express';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { STRICT_AGENT_PROMPTS } from '../lib/agent-strict-prompts.js';

const router = express.Router();

// Initialize ElevenLabs client — prefer dedicated voice key, fall back to main key
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_VOICE_API_KEY || process.env.ELEVENLABS_API_KEY
});

// ============================================
// AGENT VOICE CONFIGURATIONS
// ============================================

// ElevenLabs Voice IDs - Carefully matched to each agent's personality
const ELEVENLABS_VOICES = {
  'knight-logic': 'pNInz6obpgDQGcFmaJgB',  // Adam - deep, strategic, analytical
};

// LMNT Voice mappings (backup provider)
const LMNT_VOICES = {
  'knight-logic': 'oliver',
};

// OpenAI Realtime voices (for real-time STS)
const OPENAI_VOICES = {
  'knight-logic': 'echo',  // Analytical, strategic
};

const AGENT_VOICE_CONFIG = {
  'knight-logic': {
    gender: 'male',
    openaiVoice: OPENAI_VOICES['knight-logic'],
    elevenlabsVoice: ELEVENLABS_VOICES['knight-logic'],
    lmntVoice: LMNT_VOICES['knight-logic'],
    personality: 'analytical, strategic, calm, precise L-shaped thinker'
  }
};

// ============================================
// CHATBOX TTS — POST /api/tts (root handler)
// ============================================

/**
 * ChatBox TTS endpoint — receives { text, voiceId } and returns ElevenLabs audio
 * This is the primary TTS route called by the frontend ChatBox
 */
router.post('/', async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    // Use provided voiceId or fall back to default
    const voice = voiceId || 'pNInz6obpgDQGcFmaJgB';

    const audio = await elevenlabs.textToSpeech.convert(voice, {
      text: text.slice(0, 5000),
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.85,
        style: 0,
        use_speaker_boost: true
      }
    });

    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (error) {
    console.error('ChatBox TTS error:', error);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

// ============================================
// OPENAI REALTIME SESSION
// ============================================

/**
 * Create ephemeral session token for OpenAI Realtime API
 * This allows frontend to connect directly to OpenAI WebSocket
 */
router.post('/session', async (req, res) => {
  try {
    const { agentId, model = 'gpt-4o-realtime-preview' } = req.body;

    // Use dedicated voice key, fall back to main OpenAI key
    const OPENAI_API_KEY = process.env.OPENAI_VOICE_API_KEY || process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Get agent-specific configuration
    const agentConfig = AGENT_VOICE_CONFIG[agentId];

    // Create session with OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: agentConfig.openaiVoice,
        instructions: `${STRICT_AGENT_PROMPTS[agentId]}\n\nIMPORTANT FOR VOICE: Keep responses concise for voice conversation (1-3 sentences typically). Be conversational, natural, and stay in character.`,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI session error:', error);
      return res.status(response.status).json({ error: 'Failed to create session' });
    }

    const sessionData = await response.json();

    // Return session info with client_secret for WebSocket auth
    res.json({
      success: true,
      session: {
        id: sessionData.id,
        client_secret: sessionData.client_secret,
        expires_at: sessionData.expires_at,
        voice: agentConfig.openaiVoice,
        model
      }
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create realtime session' });
  }
});

// ============================================
// ELEVENLABS TTS SYNTHESIS
// ============================================

/**
 * Generate speech using ElevenLabs
 */
router.post('/elevenlabs', async (req, res) => {
  try {
    const { voiceId, text, stability = 0.5, similarity_boost = 0.85, style = 0, model = 'eleven_multilingual_v2' } = req.body;

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      model_id: model,
      output_format: 'pcm_24000',
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost: true
      }
    });

    // Convert stream to buffer and send
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'audio/L16;rate=24000');
    res.send(audioBuffer);

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

/**
 * Stream TTS using ElevenLabs
 */
router.post('/elevenlabs/stream', async (req, res) => {
  try {
    const { voiceId, text, stability = 0.5, similarity_boost = 0.85 } = req.body;

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    const audioStream = await elevenlabs.textToSpeech.convertAsStream(voiceId, {
      text,
      model_id: 'eleven_multilingual_v2',
      output_format: 'pcm_24000',
      voice_settings: {
        stability,
        similarity_boost,
        use_speaker_boost: true
      }
    });

    res.setHeader('Content-Type', 'audio/L16;rate=24000');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of audioStream) {
      res.write(chunk);
    }
    res.end();

  } catch (error) {
    console.error('ElevenLabs stream error:', error);
    res.status(500).json({ error: 'Stream synthesis failed' });
  }
});

/**
 * Speak as a specific agent using ElevenLabs
 */
router.post('/elevenlabs/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { text } = req.body;

    const config = AGENT_VOICE_CONFIG[agentId];
    if (!config) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    const audio = await elevenlabs.textToSpeech.convert(config.elevenlabsVoice, {
      text,
      model_id: 'eleven_multilingual_v2',
      output_format: 'pcm_24000',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.85,
        use_speaker_boost: true
      }
    });

    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'audio/L16;rate=24000');
    res.send(audioBuffer);

  } catch (error) {
    console.error('ElevenLabs agent TTS error:', error);
    res.status(500).json({ error: 'Agent TTS synthesis failed' });
  }
});

// ============================================
// LMNT TTS SYNTHESIS (Ultra-low latency)
// ============================================

/**
 * Generate speech using LMNT
 */
router.post('/lmnt', async (req, res) => {
  try {
    const { voice, text, speed = 1.0, format = 'mp3' } = req.body;

    const LMNT_API_KEY = process.env.LMNT_API_KEY;
    if (!LMNT_API_KEY) {
      return res.status(500).json({ error: 'LMNT API key not configured' });
    }

    const response = await fetch('https://api.lmnt.com/v1/ai/speech', {
      method: 'POST',
      headers: {
        'X-API-Key': LMNT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice,
        text,
        speed,
        format
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LMNT error:', error);
      return res.status(response.status).json({ error: 'TTS synthesis failed' });
    }

    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'audio/wav');
    response.body.pipe(res);

  } catch (error) {
    console.error('LMNT TTS error:', error);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

/**
 * Stream TTS using LMNT
 */
router.post('/lmnt/stream', async (req, res) => {
  try {
    const { voice, text, speed = 1.0 } = req.body;

    const LMNT_API_KEY = process.env.LMNT_API_KEY;
    if (!LMNT_API_KEY) {
      return res.status(500).json({ error: 'LMNT API key not configured' });
    }

    const response = await fetch('https://api.lmnt.com/v1/ai/speech/stream', {
      method: 'POST',
      headers: {
        'X-API-Key': LMNT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice,
        text,
        speed,
        format: 'mp3'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: 'Stream synthesis failed' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    response.body.pipe(res);

  } catch (error) {
    console.error('LMNT stream error:', error);
    res.status(500).json({ error: 'Stream synthesis failed' });
  }
});

// ============================================
// AGENT VOICE INFO
// ============================================

/**
 * Get voice configuration for an agent
 */
router.get('/voice-config/:agentId', (req, res) => {
  const { agentId } = req.params;
  const config = AGENT_VOICE_CONFIG[agentId];

  if (!config) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({
    agentId,
    ...config
  });
});

/**
 * Get all agent voice configurations
 */
router.get('/voice-configs', (req, res) => {
  res.json(AGENT_VOICE_CONFIG);
});

// ============================================
// DEEPGRAM — Premium Real-time STT (Nova-2)
// ============================================

/**
 * Transcribe audio using Deepgram Nova-2
 * Superior accuracy and speed vs Whisper for real-time voice
 */
router.post('/deepgram/transcribe', async (req, res) => {
  try {
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    if (!DEEPGRAM_API_KEY) {
      return res.status(500).json({ error: 'Deepgram API key not configured' });
    }

    const contentType = req.headers['content-type'] || 'audio/webm';
    const { language = 'en', model = 'nova-2', smart_format = true, punctuate = true, diarize = false } = req.query;

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?model=${model}&language=${language}&smart_format=${smart_format}&punctuate=${punctuate}&diarize=${diarize}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': contentType,
        },
        body: req.body,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Deepgram error:', error);
      return res.status(response.status).json({ error: 'Transcription failed' });
    }

    const result = await response.json();
    res.json({
      success: true,
      transcript: result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '',
      confidence: result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
      words: result.results?.channels?.[0]?.alternatives?.[0]?.words || [],
      provider: 'deepgram'
    });

  } catch (error) {
    console.error('Deepgram STT error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

/**
 * Get a Deepgram temporary API key for client-side WebSocket STT
 * The frontend can connect directly to Deepgram for real-time streaming STT
 */
router.post('/deepgram/key', async (req, res) => {
  try {
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    if (!DEEPGRAM_API_KEY) {
      return res.status(500).json({ error: 'Deepgram API key not configured' });
    }

    // Create a temporary key with limited scope (valid for short time)
    const response = await fetch('https://api.deepgram.com/v1/keys', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: 'Temporary key for live voice',
        scopes: ['usage:write'],
        time_to_live_in_seconds: 60
      })
    });

    if (!response.ok) {
      console.error('Deepgram temp key creation failed:', response.status, await response.text().catch(() => ''));
      return res.status(502).json({ error: 'Failed to create temporary Deepgram key' });
    }

    const data = await response.json();
    res.json({
      success: true,
      key: data.key,
      provider: 'deepgram'
    });

  } catch (error) {
    console.error('Deepgram key error:', error);
    res.status(500).json({ error: 'Failed to create Deepgram key' });
  }
});

// ============================================
// AZURE SPEECH — Premium Neural TTS & STT
// ============================================

/**
 * Get Azure Speech token for client-side SDK usage
 * Frontend uses this token with Azure Cognitive Services Speech SDK
 */
router.post('/azure/token', async (req, res) => {
  try {
    const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'southeastasia';

    if (!AZURE_SPEECH_KEY) {
      return res.status(500).json({ error: 'Azure Speech key not configured' });
    }

    // Get authorization token from Azure
    const response = await fetch(
      `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Azure token error:', error);
      return res.status(response.status).json({ error: 'Failed to get Azure token' });
    }

    const token = await response.text();
    res.json({
      success: true,
      token,
      region: AZURE_SPEECH_REGION,
      provider: 'azure'
    });

  } catch (error) {
    console.error('Azure Speech token error:', error);
    res.status(500).json({ error: 'Failed to get speech token' });
  }
});

/**
 * Azure Neural TTS — server-side synthesis
 * Uses Azure's premium neural voices (Jenny, Aria, etc.)
 */
router.post('/azure/tts', async (req, res) => {
  try {
    const { text, voice = 'en-US-JennyNeural', style = 'chat', rate = '0%', pitch = '0%' } = req.body;

    const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'southeastasia';

    if (!AZURE_SPEECH_KEY) {
      return res.status(500).json({ error: 'Azure Speech key not configured' });
    }

    // Build SSML for premium neural voice control
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
      xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
      <voice name="${voice}">
        <mstts:express-as style="${style}">
          <prosody rate="${rate}" pitch="${pitch}">
            ${text.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])}
          </prosody>
        </mstts:express-as>
      </voice>
    </speak>`;

    const response = await fetch(
      `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        },
        body: ssml,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Azure TTS error:', error);
      return res.status(response.status).json({ error: 'Azure TTS synthesis failed' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);

  } catch (error) {
    console.error('Azure TTS error:', error);
    res.status(500).json({ error: 'Azure TTS synthesis failed' });
  }
});

/**
 * Get available voice provider status
 * Returns which voice services are configured and available
 */
router.get('/providers', (req, res) => {
  res.json({
    openai_realtime: !!(process.env.OPENAI_VOICE_API_KEY || process.env.OPENAI_API_KEY),
    elevenlabs: !!(process.env.ELEVENLABS_VOICE_API_KEY || process.env.ELEVENLABS_API_KEY),
    lmnt: !!process.env.LMNT_API_KEY,
    deepgram: !!process.env.DEEPGRAM_API_KEY,
    azure_speech: !!process.env.AZURE_SPEECH_KEY,
    azure_translator: !!process.env.AZURE_TRANSLATOR_KEY,
    pyannote: !!process.env.PYANNOTE_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  });
});

export default router;
