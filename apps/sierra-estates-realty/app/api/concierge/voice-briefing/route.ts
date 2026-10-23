import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VoiceBriefingEngine } from '@sierra-estates/agents-core';

export const dynamic = 'force-dynamic';

const voiceBriefingRequestSchema = z.object({
  sierraCode: z.string().min(1, 'sierraCode is required'),
  compound: z.string().min(1, 'compound is required'),
  unitType: z.string().default('Luxury Apartment'),
  priceEGP: z.number().positive('priceEGP must be a positive number'),
  areaSqm: z.number().positive('areaSqm must be a positive number'),
  language: z.enum(['ar-EG', 'en-US']).default('ar-EG'),
  investorName: z.string().optional(),
  focus: z.enum(['rental_yield', 'capital_appreciation', 'immediate_delivery', 'overall']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = voiceBriefingRequestSchema.safeParse(rawBody);

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

    const briefing = await VoiceBriefingEngine.generateBriefing(parseResult.data);

    return NextResponse.json({
      ok: true,
      briefing,
    });
  } catch (error) {
    console.error('[VoiceBriefingAPI] Internal error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to generate investor voice briefing',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
