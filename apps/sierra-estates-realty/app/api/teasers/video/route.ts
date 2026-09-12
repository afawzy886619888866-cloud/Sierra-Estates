import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VideoTeaserEngine } from '@sierra-estates/agents-core';

export const dynamic = 'force-dynamic';

const videoTeaserRequestSchema = z.object({
  sierraCode: z.string().min(1, 'sierraCode is required'),
  compound: z.string().min(1, 'compound is required'),
  unitType: z.string().default('Luxury Apartment'),
  priceEGP: z.number().positive('priceEGP must be a positive number'),
  areaSqm: z.number().positive('areaSqm must be a positive number'),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  images: z.array(z.string()).optional(),
  subfeatures: z.array(z.string()).optional(),
  targetChannel: z.enum(['whatsapp', 'instagram_reels', 'portal']).default('whatsapp'),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = videoTeaserRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const teaser = await VideoTeaserEngine.createTeaser(parseResult.data);

    return NextResponse.json({
      ok: true,
      teaser,
    });
  } catch (error) {
    console.error('[VideoTeaserAPI] Internal error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to generate video teaser',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
