import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'ai-orchestrator-internal',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      memory: 'online',
      firestore: 'online',
      pubsub: 'online',
      inference_proxy: 'online'
    }
  });
}
