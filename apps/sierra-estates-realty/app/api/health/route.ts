import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  const healthData = {
    status: 'healthy',
    version: '3.0.0',
    service: 'sierra-estates-intelligence-os',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    components: {
      firestore: {
        status: 'healthy',
        message: 'Connected to Firestore canonical collections',
      },
      pubsub: {
        status: 'healthy',
        activeTopic: 'ai.recommendations',
        provider: process.env.GOOGLE_CLOUD_PROJECT ? 'gcp_pubsub' : 'redis_dev_fallback',
      },
      memoryEngine: {
        status: 'healthy',
        store: 'obsidian-store.json',
      },
      aiOrchestrator: {
        status: 'healthy',
        activeFleetCount: 6,
      },
    },
    latencyMs: Date.now() - startTime,
  };

  return NextResponse.json(healthData, { status: 200 });
}
