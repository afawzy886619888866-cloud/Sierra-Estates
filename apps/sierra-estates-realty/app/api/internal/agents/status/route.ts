import { NextResponse } from 'next/server';

export async function GET() {
  const agents = [
    { id: 'openclaw-architect', name: 'OpenClaw Architect', status: 'ONLINE', role: 'architect', heartbeat: new Date().toISOString() },
    { id: 'vertex-omni', name: 'Vertex Omni Agent', status: 'ONLINE', role: 'valuation', heartbeat: new Date().toISOString() },
    { id: 'concierge-lead', name: 'WhatsApp Concierge Agent', status: 'ONLINE', role: 'concierge', heartbeat: new Date().toISOString() },
    { id: 'stage9-closer', name: 'Stage 9 Closer Agent', status: 'ONLINE', role: 'negotiation', heartbeat: new Date().toISOString() },
    { id: 'sierra-ops', name: 'Sierra Deployment Ops', status: 'READY', role: 'infrastructure', heartbeat: new Date().toISOString() },
  ];

  return NextResponse.json({
    status: 'success',
    activeAgents: agents.length,
    agents,
    timestamp: new Date().toISOString(),
  });
}
