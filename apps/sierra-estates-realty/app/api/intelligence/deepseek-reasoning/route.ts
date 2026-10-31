import { NextRequest, NextResponse } from 'next/server';
import { deepseekReasoningEngine } from '@sierra-estates/deepseek-harness';
import { eccMemory } from '@/lib/eccMemoryEngine';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const eccStats = eccMemory.getStats();
    return NextResponse.json({
      success: true,
      engine: 'DeepSeek Reasoning & Evaluation Engine',
      status: 'online',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-reasoner',
      memory: {
        eccEpisodes: eccStats.totalEpisodes,
        eccEntities: eccStats.totalEntities,
        hotDeals: eccStats.totalHotDeals,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[deepseek-reasoning:GET] Error retrieving engine status', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'reason';

    if (action === 'eval') {
      const report = await deepseekReasoningEngine.runEvaluationSuite();
      return NextResponse.json({
        success: true,
        action: 'eval',
        report,
      });
    }

    if (action === 'develop') {
      const objective = body.objective || body.task || 'Optimize real estate matching pipeline';
      const plan = await deepseekReasoningEngine.developProgram(objective, body.context || {});
      return NextResponse.json({
        success: true,
        action: 'develop',
        plan,
      });
    }

    // Default: 'reason'
    const task = body.task || body.prompt;
    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        { success: false, error: 'task string is required for reasoning' },
        { status: 400 }
      );
    }

    const context = body.context || {};
    const result = await deepseekReasoningEngine.reason(task, context, {
      recordEccEpisode: body.recordEccEpisode !== false,
      author: body.author || 'deepseek-reasoner',
    });

    return NextResponse.json({
      success: true,
      action: 'reason',
      result,
    });
  } catch (error: any) {
    logger.error('[deepseek-reasoning:POST] Execution error', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message || 'Internal reasoning error' },
      { status: 500 }
    );
  }
}
