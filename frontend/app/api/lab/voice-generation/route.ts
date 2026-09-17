import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface VoiceGenerationRequest {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let experimentId = `exp_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const {
      text,
      voiceId = '21m00Tcm4TlvDq8ikWAM', // Default voice (Rachel)
      stability = 0.5,
      similarityBoost = 0.75,
    }: VoiceGenerationRequest = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Create experiment record with initial status
    await prisma.labExperiment.create({
      data: {
        experimentId,
        experimentType: 'voice-cloning',
        input: {
          prompt: text,
          settings: { voiceId, stability, similarityBoost },
        },
        status: 'processing',
        startedAt: new Date(),
      },
    });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'ElevenLabs request failed');
    }

    // Get audio data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to base64 for frontend
    const base64Audio = buffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    const processingTime = Date.now() - startTime;

    // Update experiment with results
    await prisma.labExperiment.update({
      where: { experimentId },
      data: {
        output: {
          result: audioDataUrl,
          fileUrl: audioDataUrl,
          metadata: { text, voiceId, processingTime },
        },
        status: 'completed',
        processingTime,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      audio: audioDataUrl,
      text,
      voiceId,
      experimentId,
    });
  } catch (error: any) {
    console.error('Voice Generation Error:', error);

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
      { error: error.message || 'Failed to generate voice' },
      { status: 500 }
    );
  }
}

// Get available voices
export async function GET() {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      voices: data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.labels?.description || '',
      })),
    });
  } catch (error: any) {
    console.error('Fetch Voices Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
