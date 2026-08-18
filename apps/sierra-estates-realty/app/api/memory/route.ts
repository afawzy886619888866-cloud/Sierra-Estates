import { NextRequest, NextResponse } from 'next/server';
import { memoryEngine, sharedMemory, openMemoryClient } from '@sierra-estates/memory-engine';

/**
 * SIERRA ESTATES UNIFIED MEMORY API ROUTE
 * Handles memory operations across OpenMemory HSG, SharedMemoryBus, and MemoryEngine.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || searchParams.get('id');
    const query = searchParams.get('query') || searchParams.get('q');
    const agent = searchParams.get('agent');
    const status = searchParams.get('status');

    // 1. Status query
    if (status === 'true') {
      const engineStatus = memoryEngine.getStatus();
      const busStats = await sharedMemory.stats();
      const omHealth = await openMemoryClient.health();

      return NextResponse.json({
        success: true,
        data: {
          engine: engineStatus,
          bus: busStats,
          openMemory: omHealth,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 2. Direct key lookup from shared memory
    if (key) {
      const data = await sharedMemory.read(key);
      if (data === null) {
        return NextResponse.json({ success: false, error: `Memory key '${key}' not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, key, data });
    }

    // 3. Hybrid Semantic Query (OpenMemory)
    if (query) {
      const limit = parseInt(searchParams.get('limit') || '5', 10);
      const results = await openMemoryClient.query(query, {
        userId: agent || undefined,
        limit,
      });
      return NextResponse.json({ success: true, query, count: results.length, results });
    }

    // 4. Agent Context retrieval
    if (agent) {
      const context = memoryEngine.getContext(agent);
      return NextResponse.json({ success: true, agent, context: context || {} });
    }

    // Default overview
    const busStats = await sharedMemory.stats();
    return NextResponse.json({
      success: true,
      message: 'Sierra Estates Unified Memory Engine active',
      stats: busStats,
    });
  } catch (error: any) {
    console.error('🚨 [Memory API GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to retrieve memory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, key, content, data, agentId, tags, ttlSeconds } = body;

    // 1. Semantic memory store via OpenMemory
    if (action === 'store_semantic' || (content && !action)) {
      const storeResult = await openMemoryClient.add(content || JSON.stringify(data), {
        userId: agentId || 'sierra-system',
        tags: tags || ['general'],
        metadata: data || {},
      });

      // Also mirror high-signal entries into SharedMemoryBus
      if (key) {
        await sharedMemory.write(
          key,
          { content, data, tags, storedAt: new Date().toISOString() },
          { author: (agentId as any) || 'admin', tags, ttlSeconds }
        );
      }

      return NextResponse.json({
        success: true,
        memoryId: storeResult.id,
        fallback: storeResult.fallback || false,
      });
    }

    // 2. Direct Shared Memory Write
    if (action === 'write' || (key && data)) {
      if (!key) {
        return NextResponse.json({ success: false, error: 'Missing key parameter' }, { status: 400 });
      }

      const resultKey = await sharedMemory.write(
        key,
        data,
        { author: (agentId as any) || 'admin', tags, ttlSeconds }
      );

      return NextResponse.json({ success: true, key: resultKey });
    }

    // 3. Update Agent Context in MemoryEngine
    if (action === 'update_context') {
      if (!agentId || !data) {
        return NextResponse.json({ success: false, error: 'Missing agentId or data for context update' }, { status: 400 });
      }

      memoryEngine.updateContext(agentId, data);
      return NextResponse.json({ success: true, agentId, updated: true });
    }

    // 4. Log Execution / Interaction
    if (action === 'log_execution') {
      const { execution } = body;
      if (!execution || !execution.agentId || !execution.action) {
        return NextResponse.json({ success: false, error: 'Invalid execution log payload' }, { status: 400 });
      }

      memoryEngine.logExecution(execution);
      return NextResponse.json({ success: true, logged: true });
    }

    return NextResponse.json({ success: false, error: 'Unrecognized action or payload structure' }, { status: 400 });
  } catch (error: any) {
    console.error('🚨 [Memory API POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to execute memory operation' }, { status: 500 });
  }
}
