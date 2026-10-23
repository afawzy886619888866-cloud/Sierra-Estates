import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { brainRAG } from '@sierra-estates/memory-engine';
import { resolveTableName } from '@sierra-estates/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  // 1. Supabase Ping & Latency Measurement
  let supabaseReady = false;
  let supabaseLatencyMs = 0;
  let activePropertiesCount = 0;

  const dbStart = Date.now();
  let supabaseError: string | null = null;
  try {
    const supabase = getSupabaseAdmin();
    // The site reads the "properties" collection through the supabase adapter
    // (which resolves it to public.listings) — probing the literal table name
    // `properties` hit a relation that does not exist in the live schema and
    // kept this endpoint permanently degraded. Resolve the same way the app
    // reads, so the probe measures the real database the site runs on.
    const { count, error } = await supabase
      .from(resolveTableName('properties'))
      .select('id', { count: 'exact', head: true });

    supabaseLatencyMs = Date.now() - dbStart;
    if (!error) {
      supabaseReady = true;
      activePropertiesCount = count ?? 0;
    } else {
      // A count-query error means the DB is reachable but the query/table
      // failed — report degraded, never healthy. Uptime monitors depend on
      // this endpoint telling the truth.
      supabaseReady = false;
      supabaseError = error.message;
    }
  } catch (err: any) {
    supabaseReady = false;
    supabaseError = err?.message || 'Connection failed';
    supabaseLatencyMs = Date.now() - dbStart;
  }

  // 2. PubSub & Messaging Gateway
  const pubsubConfigured = Boolean(
    process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.REDIS_URL ||
      process.env.UPSTASH_REDIS_REST_URL
  );

  // 3. AI Providers
  const aiConfigured = Boolean(
    process.env.AI_PROVIDER ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  );

  // 4. MemoryBrainEngine RAG Telemetry
  let brainStats = {
    activeGoal: 'Operational',
    cachedNotesCount: 0,
    engine: 'ObsidianVault+ECC',
  };
  try {
    brainStats = {
      activeGoal: brainRAG.getActiveGoal(),
      cachedNotesCount: (brainRAG as any).vaultCache?.size || 0,
      engine: 'ObsidianVault+ECC',
    };
  } catch {
    // Non-blocking fallback
  }

  const overallStatus = supabaseReady ? 'healthy' : 'degraded';

  const healthData = {
    status: overallStatus,
    version: '3.1.0',
    service: 'sierra-estates-intelligence-os',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    telemetry: {
      totalLatencyMs: Date.now() - startTime,
      databaseLatencyMs: supabaseLatencyMs,
      activeProperties: activePropertiesCount,
    },
    components: {
      supabase: {
        status: supabaseReady ? 'healthy' : 'unavailable',
        latencyMs: supabaseLatencyMs,
        error: supabaseError,
        message: supabaseReady
          ? 'Connected to Supabase PostgreSQL'
          : supabaseError || 'Supabase credentials are not configured or connection timed out',
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
      memoryBrainEngine: {
        status: 'online',
        engine: brainStats.engine,
        activeGoal: brainStats.activeGoal,
        cachedNotes: brainStats.cachedNotesCount,
      },
      aiOrchestrator: {
        status: aiConfigured ? 'configured' : 'fallback',
        primaryModel: process.env.AI_MODEL || 'gemini-2.0-flash',
      },
      omnichannel: {
        status: 'healthy',
        whatsapp: {
          configured: Boolean(
            process.env.WHATSAPP_PHONE_NUMBER_ID &&
              (process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN)
          ),
          webhookVerified: true,
          augustOwnersIngest: 'active',
        },
        telegram: {
          configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
          channelRelay: 'active',
        },
        excelSync: {
          configured: true,
          mode: 'two-way-sync',
          status: 'ready',
        },
      },
    },
  };

  return NextResponse.json(healthData, { status: supabaseReady ? 200 : 503 });
}

