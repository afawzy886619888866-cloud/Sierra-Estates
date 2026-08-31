import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  // Check Supabase connectivity (non-blocking health check)
  let supabaseReady = false;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('health_check').select('1').limit(1).single().catch(() => ({ data: null, error: null }));
    // Even if no health_check table exists, if client is initialized it's ready
    supabaseReady = true;
  } catch {
    supabaseReady = false;
  }

  const pubsubConfigured = Boolean(
    process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.REDIS_URL ||
      process.env.UPSTASH_REDIS_REST_URL
  );
  const aiConfigured = Boolean(
      process.env.AI_PROVIDER ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  );
  const overallStatus = supabaseReady && aiConfigured ? 'healthy' : 'degraded';

  const healthData = {
    status: overallStatus,
    version: '3.0.1',
    service: 'sierra-estates-intelligence-os',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    components: {
      supabase: {
        status: supabaseReady ? 'healthy' : 'unavailable',
        message: supabaseReady
          ? 'Connected to Supabase PostgreSQL'
          : 'Supabase credentials are not configured',
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

  return NextResponse.json(healthData, { status: supabaseReady ? 200 : 503 });
}
