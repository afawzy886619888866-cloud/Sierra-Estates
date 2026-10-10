import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SavedViewsService } from '@/lib/services/SavedViewsService';
import type { Visibility } from '@sierra-estates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createViewSchema = z.object({
  title: z.string().min(2, 'View title must be at least 2 characters').max(120),
  dsl: z.string().min(5, 'DSL specification must be at least 5 characters'),
  visibility: z.enum(['public', 'broker', 'investor', 'internal']).optional().default('broker'),
  description: z.string().max(500).optional(),
  createdBy: z.string().max(80).optional(),
});

/**
 * GET /api/views
 * List saved views with optional visibility filter.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const visibility = searchParams.get('visibility') as Visibility | null;

    const views = await SavedViewsService.listViews(
      visibility ? { visibility } : undefined,
    );

    return NextResponse.json({
      success: true,
      count: views.length,
      views,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to list saved views' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/views
 * Parse DSL, validate, and save a broker view.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = createViewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { title, dsl, visibility, description, createdBy } = parseResult.data;

    const view = await SavedViewsService.saveView({
      title,
      dsl,
      visibility,
      description,
      createdBy,
    });

    return NextResponse.json(
      {
        success: true,
        id: view.id,
        shareUrl: view.shareUrl,
        view,
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save view' },
      { status: 500 },
    );
  }
}
