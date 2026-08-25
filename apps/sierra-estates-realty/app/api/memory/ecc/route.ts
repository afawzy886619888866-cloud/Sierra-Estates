import { NextRequest, NextResponse } from 'next/server';
import { eccMemory, Episode } from '@/lib/eccMemoryEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId');

    if (entityId) {
      const episodes = eccMemory.getEpisodesForEntity(entityId);
      const entity = eccMemory.getEntity(entityId);
      return NextResponse.json({
        success: true,
        entity,
        episodes,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'ECC Memory Engine is online.',
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
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === 'record_episode') {
      const episode = eccMemory.recordEpisode(body.episode as Episode);
      return NextResponse.json({ success: true, episode });
    }

    if (body.action === 'find_matching_buyers') {
      const matches = eccMemory.findMatchingBuyers(body.property);
      return NextResponse.json({ success: true, matches });
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
