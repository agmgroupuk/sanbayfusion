import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Demo audio samples (royalty-free music URLs) for fallback
const DEMO_AUDIO_SAMPLES: Record<string, string[]> = {
  electronic: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  ],
  rock: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  ],
  jazz: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  ],
  classical: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  ],
  'hip hop': [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  ],
  ambient: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
  ],
  pop: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
  ],
  cinematic: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
  ],
  default: [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  ],
};

function getDemoAudio(genre?: string): string {
  const genreLower = genre?.toLowerCase() || 'default';
  const samples = DEMO_AUDIO_SAMPLES[genreLower] || DEMO_AUDIO_SAMPLES.default;
  return samples[Math.floor(Math.random() * samples.length)];
}

// Helper to poll HuggingFace for result (models can take time to load)
async function pollHuggingFace(
  url: string,
  headers: Record<string, string>,
  body: string,
  maxAttempts = 10,
  delayMs = 5000
): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (response.ok) {
      return await response.arrayBuffer();
    }

    // Check if model is loading (503) - wait and retry
    if (response.status === 503) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`HuggingFace model loading, attempt ${attempt + 1}/${maxAttempts}...`, errorData);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    // Other errors - throw
    const errorText = await response.text();
    throw new Error(`HuggingFace error ${response.status}: ${errorText}`);
  }
  throw new Error('HuggingFace model did not load in time');
}

interface MusicGenerationRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  duration?: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let experimentId = `exp_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const {
      prompt,
      genre,
      mood,
      duration = 10, // HuggingFace free tier works better with shorter durations
    }: MusicGenerationRequest = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Enhance prompt with genre and mood
    let enhancedPrompt = prompt;
    if (genre) enhancedPrompt += `, ${genre} genre`;
    if (mood) enhancedPrompt += `, ${mood} mood`;

    // Create experiment record with initial status
    await prisma.labExperiment.create({
      data: {
        experimentId,
        experimentType: 'music-generator',
        input: {
          prompt: enhancedPrompt,
          settings: { genre, mood, duration },
        },
        status: 'processing',
        startedAt: new Date(),
      },
    });

    let output: string;
    let isDemo = false;
    const provider = 'huggingface';

    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
    
    if (!HUGGINGFACE_API_KEY) {
      console.log('HuggingFace API key not configured, using demo audio');
      output = getDemoAudio(genre);
      isDemo = true;
    } else {
      try {
        // Using HuggingFace Inference API with MusicGen Small (faster loading)
        const audioBuffer = await pollHuggingFace(
          'https://api-inference.huggingface.co/models/facebook/musicgen-small',
          {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          JSON.stringify({
            inputs: enhancedPrompt,
            parameters: {
              max_new_tokens: Math.min(duration * 50, 500), // ~10 tokens per second of audio
            },
          }),
          15, // max attempts
          4000 // delay between attempts (4 seconds)
        );

        // Convert to base64 data URL
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        output = `data:audio/wav;base64,${base64Audio}`;
        
        console.log('HuggingFace MusicGen generation successful');
      } catch (hfError: any) {
        console.error('HuggingFace error:', hfError.message);
        console.log('Falling back to demo audio');
        output = getDemoAudio(genre);
        isDemo = true;
      }
    }

    const processingTime = Date.now() - startTime;

    // Update experiment with results
    await prisma.labExperiment.update({
      where: { experimentId },
      data: {
        output: {
          result: output,
          fileUrl: output,
          metadata: { prompt: enhancedPrompt, duration, processingTime, isDemo, provider: isDemo ? 'demo' : provider },
        },
        status: 'completed',
        processingTime,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      audio: output,
      prompt: enhancedPrompt,
      duration,
      experimentId,
      isDemo,
      provider: isDemo ? 'demo' : provider,
      ...(isDemo && { 
        notice: 'Demo mode: Using sample audio. AI generation temporarily unavailable.' 
      }),
    });
  } catch (error: any) {
    console.error('Music Generation Error:', error);

    // Update experiment with error status
    try {
      await prisma.labExperiment.update({
        where: { experimentId },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
    } catch (updateError) {
      console.error('Failed to update experiment error status:', updateError);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate music' },
      { status: 500 }
    );
  }
}
