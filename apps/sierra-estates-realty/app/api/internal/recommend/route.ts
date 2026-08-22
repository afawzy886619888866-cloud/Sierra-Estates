import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const recommendation = {
      recommendationId: `rec-${Date.now()}`,
      clientId: body.clientId || 'broadcast',
      listingCodes: body.listingCodes || ['MI-S-4F-38M+G+P', 'HY-P-3S-16.5M+R+L'],
      matchScore: 0.94,
      rationale: 'Top-tier luxury units with verified owner terms and competitive price/sqm.',
      suggestedAction: body.suggestedAction || 'send_whatsapp',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, recommendation });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
