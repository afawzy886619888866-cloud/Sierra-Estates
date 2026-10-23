import { NextRequest, NextResponse } from 'next/server';
import { eccMemory, Episode } from '@/lib/eccMemoryEngine';
import { brainRAG } from '@sierra-estates/memory-engine';
import {
  recordEccEpisodeViaPythonApi,
  trackPriceReductionViaPythonApi,
} from '@/lib/server/python-api-client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId');
    const query = searchParams.get('query');

    if (query) {
      const rag = brainRAG.queryBrainRAG(query, {
        entityId: entityId || undefined,
        compound: searchParams.get('compound') || undefined,
      });
      return NextResponse.json({
        success: true,
        rag,
      });
    }

    if (entityId) {
      const episodes = eccMemory.getEpisodesForEntity(entityId);
      const entity = eccMemory.getEntity(entityId);
      return NextResponse.json({
        success: true,
        entity,
        episodes,
      });
    }

    const stats = eccMemory.getStats();
    const hotDeals = eccMemory.getHotDeals(10);
    const recentEpisodes = eccMemory.getRecentEpisodes(15);
    const entities = eccMemory.getAllEntities();

    return NextResponse.json({
      success: true,
      message: 'ECC Memory Engine & Unified Brain RAG are online.',
      activeGoal: brainRAG.getActiveGoal(),
      stats,
      hotDeals,
      recentEpisodes,
      entities,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'track_price_drop') {
      const { sierraCode, oldPrice, newPrice, source, ownerName } = body;
      const result = eccMemory.trackPriceReduction(
        sierraCode,
        oldPrice,
        newPrice,
        source || 'WhatsApp Drop',
        ownerName
      );

      // Asynchronously synchronize with Python microservice if available
      trackPriceReductionViaPythonApi({
        sierraCode,
        oldPrice,
        newPrice,
        source: source || 'WhatsApp Drop',
      }).catch(() => {});

      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === 'record_episode') {
      const episode = eccMemory.recordEpisode(body.episode as Episode);

      // Asynchronously synchronize with Python microservice if available
      if (body.episode?.entityId) {
        recordEccEpisodeViaPythonApi(body.episode).catch(() => {});
      }

      return NextResponse.json({ success: true, episode });
    }

    if (body.action === 'find_matching_buyers') {
      const matches = eccMemory.findMatchingBuyers(body.property);
      return NextResponse.json({ success: true, matches });
    }

    if (body.action === 'query_rag' || body.action === 'rag_context') {
      const rag = brainRAG.queryBrainRAG(body.query || '', {
        entityId: body.entityId,
        compound: body.compound,
        maxVaultResults: body.maxVaultResults || 3,
        maxEpisodes: body.maxEpisodes || 4,
      });
      return NextResponse.json({ success: true, rag });
    }

    if (body.action === 'set_goal') {
      if (!body.goal || typeof body.goal !== 'string') {
        return NextResponse.json({ success: false, error: 'Goal string required' }, { status: 400 });
      }
      brainRAG.setActiveGoal(body.goal);
      return NextResponse.json({ success: true, activeGoal: brainRAG.getActiveGoal() });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action parameter' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
