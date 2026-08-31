import { NextRequest, NextResponse } from 'next/server';
import { NotebookLMEngine, SourceDocument } from '@sierra-estates/agents-core';
import { logger } from '@/lib/logger';

export const maxDuration = 60; // 60 seconds for deep audio overview synthesis

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'query', query, sources = [], focusTopic, language = 'ar' } = body;

    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    const engine = new NotebookLMEngine(apiKey);

    if (action === 'corpus') {
      const defaultCorpus = NotebookLMEngine.getDefaultCorpus();
      return NextResponse.json({
        success: true,
        sources: defaultCorpus,
      });
    }

    if (action === 'query') {
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Query is required for grounded Q&A' }, { status: 400 });
      }

      const result = await engine.queryGroundedSources(sources as SourceDocument[], query, language);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'audio-overview') {
      const result = await engine.generateAudioOverview(sources as SourceDocument[], focusTopic, language);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'study-guide') {
      const result = await engine.generateStudyGuide(sources as SourceDocument[], language);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    logger.error('❌ [NotebookLM API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'NotebookLM Processing Error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const defaultCorpus = NotebookLMEngine.getDefaultCorpus();
  return NextResponse.json({
    name: 'Sierra Estates Google NotebookLM Studio API',
    status: 'online',
    defaultSourcesCount: defaultCorpus.length,
    features: ['Grounded Q&A with Direct Citations', 'Audio Overview Podcast Script Generator', 'Executive Study Guide Synthesis'],
  });
}
