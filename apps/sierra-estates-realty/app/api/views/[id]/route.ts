import { NextRequest, NextResponse } from 'next/server';
import { SavedViewsService } from '@/lib/services/SavedViewsService';
import { applyFieldVisibility } from '@sierra-estates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/views/[id]
 * Load a saved view by ID, with optional live execution (?execute=true).
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing view ID' }, { status: 400 });
    }

    const view = await SavedViewsService.getView(id);
    if (!view) {
      return NextResponse.json({ success: false, error: 'View not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const shouldExecute = searchParams.get('execute') === 'true';

    if (shouldExecute) {
      const rawResults = await SavedViewsService.executeView(view);
      const formattedResults = rawResults.map((r) => applyFieldVisibility(r, view.parsedView));

      return NextResponse.json({
        success: true,
        view,
        total: formattedResults.length,
        results: formattedResults,
      });
    }

    return NextResponse.json({
      success: true,
      view,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load view' },
      { status: 500 },
    );
  }
}
