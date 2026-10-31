import { NextRequest } from 'next/server';
import { sharedPubSub, HarvesterOpportunityEvent } from '@/lib/pubsub';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/harvester/stream
 *
 * Real-time Server-Sent Events (SSE) route streaming sanitized WhatsApp
 * harvester opportunities, valuation arbitrage, and hot deal price reductions
 * directly to the client GIS map and admin telemetry.
 *
 * Security & Governance:
 * - Strict PII stripping: Zero phone numbers, broker personal contacts, or raw message bodies.
 * - Complies with §21 No-Fabrication and MCD protocol HARV-030-003.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let unsubscribeHarvester: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          logger.warn('[Harvester SSE] Failed to enqueue event, controller likely closed:', err);
        }
      };

      // 1. Send initial connection confirmation
      sendEvent('connected', {
        status: 'active',
        service: 'Sierra Harvester Live Stream',
        timestamp: new Date().toISOString(),
      });

      // 2. Subscribe to real-time sanitized harvester opportunities
      unsubscribeHarvester = sharedPubSub.onHarvesterEvent((evt: HarvesterOpportunityEvent) => {
        // Double-check PII sanitization before transmitting to client stream
        const sanitized: HarvesterOpportunityEvent = {
          id: evt.id,
          compound: evt.compound,
          type: evt.type,
          price: evt.price,
          areaSqm: evt.areaSqm,
          pricePerSqm: evt.pricePerSqm,
          mode: evt.mode,
          discountPct: evt.discountPct,
          hotDeal: evt.hotDeal,
          notes: evt.notes,
          lat: evt.lat,
          lng: evt.lng,
          timestamp: evt.timestamp,
        };
        sendEvent('opportunity', sanitized);
      });

      // 3. Heartbeat ping every 15 seconds to keep connection alive through load balancers
      heartbeatTimer = setInterval(() => {
        sendEvent('ping', { timestamp: new Date().toISOString() });
      }, 15000);

      // Clean up if connection aborted by client
      req.signal.addEventListener('abort', () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (unsubscribeHarvester) unsubscribeHarvester();
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      });
    },

    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (unsubscribeHarvester) unsubscribeHarvester();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
