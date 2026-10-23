import { NextResponse } from 'next/server';
import { countRecords } from '@sierra-estates/db';

/**
 * Internal liveness/readiness probe.
 *
 * The database check used to be a hardcoded `firestore: 'online'`, which
 * reported healthy even with the database completely unreachable — the one
 * thing a health endpoint exists to catch. It now actually round-trips to
 * Supabase (a HEAD count, so no rows are transferred) and reports what it
 * finds. The `firestore` key is gone: this deployment no longer talks to
 * Firestore on this path, and a key named after a database we don't check is
 * worse than no key at all.
 *
 * memory / pubsub / inference_proxy are still unprobed placeholders — they are
 * not part of this migration and are left exactly as they were.
 */
export async function GET() {
  let supabase: 'online' | 'offline' = 'online';
  try {
    await countRecords('system_config');
  } catch {
    supabase = 'offline';
  }

  return NextResponse.json({
    status: supabase === 'online' ? 'healthy' : 'degraded',
    service: 'ai-orchestrator-internal',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      memory: 'online',
      supabase,
      pubsub: 'online',
      inference_proxy: 'online'
    }
  });
}
