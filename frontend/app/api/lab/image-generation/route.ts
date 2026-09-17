import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface ImageGenerationRequest {
  prompt: string;
  style: string;
  width?: number;
  height?: number;
}

const stylePrompts: Record<string, string> = {
  realistic:
    'photorealistic, highly detailed, 8k uhd, professional photography',
  artistic:
    'artistic painting, creative interpretation, vibrant colors, expressive brushstrokes',
  anime:
    'anime style, manga art, japanese animation, vibrant colors, cel shaded',
  'oil-painting':
    'oil painting, classical art, textured brushstrokes, rich colors, artistic masterpiece',
  watercolor:
    'watercolor painting, soft colors, flowing edges, artistic, delicate',
  'digital-art':
    'digital art, modern illustration, clean lines, vibrant, contemporary',
  '3d-render':
    '3d render, octane render, unreal engine, photorealistic, detailed lighting',
  'pixel-art': 'pixel art, retro gaming style, 8-bit, 16-bit, nostalgic',
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let experimentId = `exp_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const {
      prompt,
      style,
      width = 1024,
      height = 1024,
    }: ImageGenerationRequest = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Enhance prompt with style
    const styleModifier = stylePrompts[style] || '';
    const enhancedPrompt = `${prompt}, ${styleModifier}`;

    // Create experiment record with initial status
    await prisma.labExperiment.create({
      data: {
        experimentId,
        experimentType: 'neural-art',
        input: {
          prompt: enhancedPrompt,
          settings: { style, width, height },
        },
        status: 'processing',
        startedAt: new Date(),
      },
    });

    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: enhancedPrompt,
              weight: 1,
            },
          ],
          cfg_scale: 7,
          height: height,
          width: width,
          samples: 1,
          steps: 30,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Stability AI request failed');
    }

    const data = await response.json();

    // Stability AI returns base64 encoded images
    const image = data.artifacts[0];
    const imageDataUrl = `data:image/png;base64,${image.base64}`;
    const processingTime = Date.now() - startTime;

    // Update experiment with results
    await prisma.labExperiment.update({
      where: { experimentId },
      data: {
        output: {
          result: imageDataUrl,
          fileUrl: imageDataUrl,
          metadata: {
            seed: image.seed,
            prompt: enhancedPrompt,
            processingTime,
          },
        },
        status: 'completed',
        processingTime,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      image: imageDataUrl,
      seed: image.seed,
      prompt: enhancedPrompt,
      experimentId,
    });
  } catch (error: any) {
    console.error('Image Generation Error:', error);

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
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
