import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import sharp from 'sharp';

// Map style names to artistic prompts
const stylePrompts: Record<string, string> = {
  'van-gogh':
    'in the style of Vincent van Gogh, post-impressionism, swirling brushstrokes, vibrant colors, starry night aesthetic',
  picasso:
    'in the style of Pablo Picasso, cubism, geometric shapes, fragmented perspective, bold lines',
  monet:
    'in the style of Claude Monet, impressionism, soft brushwork, light and color, water lilies aesthetic',
  kandinsky:
    'in the style of Wassily Kandinsky, abstract expressionism, bold colors and shapes, geometric',
  dali: 'in the style of Salvador Dalí, surrealism, dreamlike, melting forms, bizarre imagery',
  warhol:
    'in the style of Andy Warhol, pop art, bold colors, repeated patterns, screen print style',
  abstract: 'abstract art style, modern, geometric patterns, vibrant colors, non-representational',
  watercolor:
    'watercolor painting style, soft edges, translucent colors, flowing, wet on wet technique',
};

export async function POST(req: Request) {
  const startTime = Date.now();
  let experimentId = `exp_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const { imageUrl, style } = await req.json();

    if (!imageUrl || !style) {
      return NextResponse.json(
        { error: 'Image URL and style are required' },
        { status: 400 }
      );
    }

    // Create experiment record with initial status
    await prisma.labExperiment.create({
      data: {
        experimentId,
        experimentType: 'neural-art',
        input: {
          prompt: `Transform image with ${style} style`,
          settings: { style },
        },
        status: 'processing',
        startedAt: new Date(),
      },
    });

    const stylePrompt = stylePrompts[style] || stylePrompts['abstract'];
    
    // Use Stability AI for image-to-image transformation
    const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
    
    if (!STABILITY_API_KEY) {
      throw new Error('Stability API key not configured');
    }

    // Fetch the source image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Resize image to 1024x1024 (required by Stability AI SDXL)
    const resizedImageBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(1024, 1024, { fit: 'cover' })
      .png()
      .toBuffer();
    
    const imageBlob = new Blob([resizedImageBuffer], { type: 'image/png' });
    
    // Build FormData for multipart request
    const formData = new FormData();
    formData.append('init_image', imageBlob, 'image.png');
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.35');
    formData.append('text_prompts[0][text]', `Transform this image ${stylePrompt}, artistic masterpiece, high quality`);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('text_prompts[1][text]', 'blurry, low quality, distorted, ugly, bad art');
    formData.append('text_prompts[1][weight]', '-1');
    formData.append('cfg_scale', '7');
    formData.append('steps', '30');
    formData.append('samples', '1');
    
    // Use Stability AI's image-to-image endpoint
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${STABILITY_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Stability AI error:', response.status, errorData);
      throw new Error(`Stability AI error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Stability AI returns base64 encoded images
    const generatedImage = data.artifacts?.[0]?.base64;
    if (!generatedImage) {
      throw new Error('No image generated from Stability AI');
    }

    // Convert to data URL
    const resultImage = `data:image/png;base64,${generatedImage}`;
    const processingTime = Date.now() - startTime;

    // Update experiment with results
    await prisma.labExperiment.update({
      where: { experimentId },
      data: {
        output: {
          result: resultImage,
          fileUrl: resultImage,
          metadata: { style, processingTime, provider: 'stability-ai' },
        },
        status: 'completed',
        processingTime,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      image: resultImage,
      style,
      experimentId,
      provider: 'stability-ai',
    });
  } catch (error: any) {
    console.error('Neural art generation error:', error);

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
      { error: error.message || 'Failed to generate neural art. Please try again.' },
      { status: 500 }
    );
  }
}
