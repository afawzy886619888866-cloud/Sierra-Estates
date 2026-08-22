import { NextRequest, NextResponse } from 'next/server';

interface AgentHeartbeat {
  id: string;
  name: string;
  status: 'ONLINE' | 'RUNNING' | 'IDLE' | 'READY' | 'DEGRADED';
  role: string;
  load?: string;
  heartbeat: string;
  needs?: string[];
  missingSecrets?: string[];
  docLink?: string;
}

// In-memory heartbeat cache for live agent fleet & simulator
const liveHeartbeats = new Map<string, AgentHeartbeat>();

function getDefaultFleet(): AgentHeartbeat[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'sierra-bot',
      name: 'Sierra Bot (AI Concierge)',
      status: 'ONLINE',
      role: 'Primary client inquiry & Arabic intake',
      load: '94%',
      heartbeat: now,
      needs: ['HUGGINGFACE_API_KEY', 'Firestore Access'],
      missingSecrets: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN ? [] : ['HUGGINGFACE_API_KEY (optional for DeepSeek-R1 inference)'],
      docLink: '/docs/roles.md#1-ai-concierge-lead',
    },
    {
      id: 'laila-bilingual',
      name: 'Laila / Lola (Bilingual Specialist)',
      status: 'ONLINE',
      role: 'Gulf dialect parsing & instant translation',
      load: '87%',
      heartbeat: now,
      needs: ['Arabic NLP tokenizer', 'Compound dictionary'],
      missingSecrets: [],
      docLink: '/docs/roles.md#1-ai-concierge-lead',
    },
    {
      id: 'stage9-closer',
      name: 'Stage-9 Closer (Deal & Contract)',
      status: 'ONLINE',
      role: 'Automated contract generation & negotiations',
      load: '71%',
      heartbeat: now,
      needs: ['DocuSign Template', 'EGP Escrow Schema'],
      missingSecrets: [],
      docLink: '/docs/roles.md#3-stage-9-closer-deal-engine',
    },
    {
      id: 'openclaw-architect',
      name: 'OpenClaw Architect',
      status: 'ONLINE',
      role: 'Autonomous memory grounding & WhatsApp scraper runner',
      load: '65%',
      heartbeat: now,
      needs: ['Obsidian Memory Store', 'File System Access'],
      missingSecrets: [],
      docLink: '/docs/roles.md#4-openclaw-architect',
    },
    {
      id: 'the-curator',
      name: 'The Curator (S3-S5 Valuation)',
      status: 'ONLINE',
      role: 'Cairo AVM, price adjustment & deduplication',
      load: '68%',
      heartbeat: now,
      needs: ['PropertyFinder Syndication', 'AVM Historical Weights'],
      missingSecrets: process.env.PROPERTYFINDER_KEY ? [] : ['PROPERTYFINDER_KEY (required for live syndication)'],
      docLink: '/docs/roles.md#2-the-curator--scribe',
    },
    {
      id: 'the-scribe',
      name: 'The Scribe (S1-S2 Ingestion)',
      status: 'ONLINE',
      role: 'Raw WhatsApp & listing text parser',
      load: '45%',
      heartbeat: now,
      needs: ['Raw Message Ingestion Queue'],
      missingSecrets: [],
      docLink: '/docs/roles.md#2-the-curator--scribe',
    },
    {
      id: 'insights-agent',
      name: 'Strategic Market Insights Agent',
      status: 'ONLINE',
      role: 'DeepSeek AVM market liquidity & pricing analysis',
      load: '58%',
      heartbeat: now,
      needs: ['Pub/Sub ai.recommendations', 'Harness Benchmark Suite'],
      missingSecrets: [],
      docLink: '/docs/roles.md#5-market-insights-agent',
    },
    {
      id: 'sierra-ops',
      name: 'Sierra Deployment Ops',
      status: 'READY',
      role: 'CI/CD pipeline, Vercel deployments & Sentry monitoring',
      load: '30%',
      heartbeat: now,
      needs: ['VERCEL_TOKEN', 'SENTRY_DSN'],
      missingSecrets: process.env.VERCEL_TOKEN ? [] : ['VERCEL_TOKEN (set in Vercel project environment)'],
      docLink: '/docs/roles.md#6-devops--infrastructure',
    },
  ];
}

export async function GET() {
  const defaultFleet = getDefaultFleet();
  
  // Merge live simulator heartbeats with default fleet
  const agents = defaultFleet.map(agent => {
    const live = liveHeartbeats.get(agent.id);
    if (live) {
      return { ...agent, ...live };
    }
    return agent;
  });

  const orchestratorUrl = process.env.ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://127.0.0.1:3000';
  const orchestratorToken = process.env.ORCHESTRATOR_TOKEN ? 'configured' : 'dev-fallback-active';

  const systemNeeds = [
    {
      name: 'ORCHESTRATOR_URL',
      status: 'READY',
      value: orchestratorUrl,
      description: 'Base endpoint for AI Orchestrator service',
    },
    {
      name: 'ORCHESTRATOR_TOKEN',
      status: process.env.ORCHESTRATOR_TOKEN ? 'READY' : 'DEV_MODE',
      value: orchestratorToken,
      description: 'Bearer token for orchestrator security guardrails',
    },
    {
      name: 'Pub/Sub ai.recommendations',
      status: 'ONLINE',
      value: 'Cloud PubSub + Redis/Memory EventBus fallback',
      description: 'High-throughput recommendation distribution stream',
    },
    {
      name: 'PropertyFinder Connector',
      status: process.env.PROPERTYFINDER_KEY ? 'READY' : 'SIMULATION',
      value: process.env.PROPERTYFINDER_KEY ? 'API Key Active' : 'Fallback / Mock Sync Available',
      description: 'Syndication sync engine for property listings',
    },
    {
      name: 'DeepSeek Inference Proxy',
      status: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN ? 'ONLINE' : 'LOCAL_REASONER',
      value: process.env.HUGGINGFACE_API_KEY ? 'HuggingFace Serverless Active' : 'Local Deterministic Fallback Active',
      description: 'AVM reasoning and multi-turn query answering',
    },
  ];

  return NextResponse.json({
    success: true,
    activeAgents: agents.length,
    agents,
    systemNeeds,
    environment: {
      orchestratorUrl,
      orchestratorTokenConfigured: Boolean(process.env.ORCHESTRATOR_TOKEN),
      nodeEnv: process.env.NODE_ENV || 'production',
      memoryEngineActive: true,
    },
    insightsSummary: {
      latestInsight: 'Strong Secondary Resale Demand Detected in New Cairo General (Mivida & Hyde Park)',
      confidence: 0.94,
      action: 'Target direct-owner cash buyers with high urgency listings.',
      monitoredUnits: 306,
    },
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, status, role, load, needs, missingSecrets, docLink } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Agent ID is required' }, { status: 400 });
    }

    const heartbeatRecord: AgentHeartbeat = {
      id,
      name: name || id,
      status: status || 'ONLINE',
      role: role || 'AI Worker Agent',
      load: load || '50%',
      heartbeat: new Date().toISOString(),
      needs: needs || [],
      missingSecrets: missingSecrets || [],
      docLink: docLink || '/docs/roles.md',
    };

    liveHeartbeats.set(id, heartbeatRecord);

    return NextResponse.json({
      success: true,
      message: `Heartbeat registered for agent ${id}`,
      agent: heartbeatRecord,
      timestamp: heartbeatRecord.heartbeat,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
