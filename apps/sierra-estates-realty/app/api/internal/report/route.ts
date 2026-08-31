import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    reportId: `rep-${Date.now()}`,
    title: 'Sierra Estates Strategic Real Inventory Report',
    activeProperties: 306,
    monitoredCompounds: 19,
    valuationConfidence: 0.94,
    source: 'static-fallback',
    mockMode: true,
    generatedAt: new Date().toISOString(),
  });
}
