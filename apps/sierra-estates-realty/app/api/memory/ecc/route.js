 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { eccMemory, } from '@/lib/eccMemoryEngine';
import {
  recordEccEpisodeViaPythonApi,
  trackPriceReductionViaPythonApi,
} from '@/lib/server/python-api-client';

export async function GET(req) {
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
      { success: false, error: (error ).message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
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
      const episode = eccMemory.recordEpisode(body.episode );

      // Asynchronously synchronize with Python microservice if available
      if (_optionalChain([body, 'access', _ => _.episode, 'optionalAccess', _2 => _2.entityId])) {
        recordEccEpisodeViaPythonApi(body.episode).catch(() => {});
      }

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
      { success: false, error: (error ).message },
      { status: 500 }
    );
  }
}
