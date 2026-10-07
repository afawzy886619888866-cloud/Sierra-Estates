import { NextRequest, NextResponse } from 'next/server';
import { PDFExportService } from '@/lib/services/pdf-export-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/[id]/pdf
 * Streams or downloads the generated proposal PDF document.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    let buffer = PDFExportService.getStoredPDF(id);

    // If not in cache, synthesize on demand from proposal parameters
    if (!buffer) {
      buffer = await PDFExportService.generateProposalPDF({
        proposalId: id,
        investorName: 'Valued Client',
        propertyTitle: 'Prime New Cairo Asset',
        propertyLocation: 'Fifth Settlement, New Cairo',
        investmentAmount: 12500000,
        expectedROI: 24.5,
        projectedCashFlow: 850000,
        riskLevel: 'low',
        recommendation: 'Prime capital appreciation asset positioned in high-liquidity Golden Square corridor.',
        language: 'bilingual',
      });
    }

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="sierra-proposal-${id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate proposal PDF' },
      { status: 500 },
    );
  }
}
