import { NextResponse } from 'next/server';
import { isAdminInitialized, loadAndInitializeAdmin } from '@/lib/server/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  await loadAndInitializeAdmin();

  const firestoreReady = isAdminInitialized;
  const pubsubConfigured = Boolean(
    process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.REDIS_URL ||
      process.env.UPSTASH_REDIS_REST_URL
  );
  const aiConfigured = Boolean(
    process.env.AI_PROVIDER ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  );
  const overallStatus = firestoreReady && aiConfigured ? 'healthy' : 'degraded';

  const healthData = {
    status: overallStatus,
    version: '3.0.0',
    service: 'sierra-estates-intelligence-os',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    components: {
      firestore: {
        status: firestoreReady ? 'healthy' : 'unavailable',
        message: firestoreReady
          ? 'Connected to Firestore canonical collections'
          : 'Firebase Admin credentials are not configured or initialization failed',
      },
      pubsub: {
        status: pubsubConfigured ? 'configured' : 'fallback',
        activeTopic: 'ai.recommendations',
        provider: process.env.GOOGLE_CLOUD_PROJECT
          ? 'gcp_pubsub'
          : pubsubConfigured
            ? 'redis'
            : 'in_memory_fallback',
      },
      memoryEngine: {
        status: process.env.VERCEL ? 'ephemeral' : 'local',
        store: 'obsidian-store.json',
      },
      aiOrchestrator: {
        status: aiConfigured ? 'configured' : 'unavailable',
      },
    },
    latencyMs: Date.now() - startTime,
  };

  return NextResponse.json(healthData, { status: firestoreReady ? 200 : 503 });
}
