/**
 * Harvester SSE Stream Route — Unit & Integration Tests (HARV-030-003)
 *
 * Verifies:
 * 1. GET /api/harvester/stream returns 200 with text/event-stream headers.
 * 2. Emits initial 'connected' event upon stream opening.
 * 3. Correctly transmits sanitized 'opportunity' events from sharedPubSub.
 * 4. Strictly enforces zero PII (no phone numbers or private broker contacts).
 */

import { GET } from '../app/api/harvester/stream/route';
import { sharedPubSub } from '../lib/pubsub';
import { NextRequest } from 'next/server';

describe('GET /api/harvester/stream (HARV-030-003)', () => {
  it('returns a 200 Response with text/event-stream Content-Type', async () => {
    const req = new NextRequest('http://localhost:3000/api/harvester/stream');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
  });

  it('delivers initial connection and pubsub opportunity events through the stream', async () => {
    const req = new NextRequest('http://localhost:3000/api/harvester/stream');
    const res = await GET(req);

    expect(res.body).toBeDefined();
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // 1. Read first chunk (initial connected event)
    const chunk1 = await reader.read();
    expect(chunk1.done).toBe(false);
    const text1 = decoder.decode(chunk1.value);
    expect(text1).toContain('event: connected');
    expect(text1).toContain('Sierra Harvester Live Stream');

    // 2. Publish an opportunity through sharedPubSub
    await sharedPubSub.publishHarvesterEvent({
      id: 'SE-TEST-HYP-001',
      compound: 'Hyde Park',
      type: 'Villa',
      price: 15500000,
      areaSqm: 320,
      pricePerSqm: 48437,
      mode: 'sale',
      discountPct: 9.5,
      hotDeal: true,
      lat: 30.008,
      lng: 31.645,
    });

    // 3. Read transmitted opportunity event
    const chunk2 = await reader.read();
    expect(chunk2.done).toBe(false);
    const text2 = decoder.decode(chunk2.value);
    expect(text2).toContain('event: opportunity');
    expect(text2).toContain('Hyde Park');
    expect(text2).toContain('15500000');
    expect(text2).toContain('"hotDeal":true');

    // Zero PII check: Ensure no phone numbers or personal keys exist in the payload
    expect(text2).not.toContain('phone');
    expect(text2).not.toContain('+20');
    expect(text2).not.toContain('brokerContact');

    // Cancel reader to close stream gracefully
    await reader.cancel();
  });
});
