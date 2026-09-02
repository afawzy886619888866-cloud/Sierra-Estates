import { NextResponse } from 'next/server';
import { DeepSeekHarness } from '@sierra-estates/deepseek-harness';

export async function POST() {
  try {
    const harness = new DeepSeekHarness();
    const report = await harness.runFullSuite();

    return NextResponse.json({
      success: true,
      report,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error ).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
