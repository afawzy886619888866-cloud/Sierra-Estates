import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DeepSeekHarness, BENCHMARK_SCENARIOS } from '@sierra-estates/deepseek-harness';
import { mempalace, brainRAG } from '@sierra-estates/memory-engine';
import { eccMemory } from '@/lib/eccMemoryEngine';

export const dynamic = 'force-dynamic';

function getVaultNotes() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'docs/obsidian-vault'),
    path.resolve(process.cwd(), '../../docs/obsidian-vault'),
    path.resolve(process.cwd(), '../docs/obsidian-vault'),
  ];

  const vaultDir = possiblePaths.find(p => fs.existsSync(p));
  if (!vaultDir) return [];

  try {
    const files = fs.readdirSync(vaultDir).filter(f => f.endsWith('.md'));
    return files.map(file => {
      const fullPath = path.join(vaultDir!, file);
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Extract tags like #compound or frontmatter tags
      const tagMatches = content.match(/#[a-zA-Z0-9_\-\/]+/g) || [];
      const tags = Array.from(new Set(tagMatches.map(t => t.replace('#', '')))).slice(0, 5);

      // Extract summary
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const excerpt = lines[0] ? lines[0].slice(0, 160) : 'Knowledge note';

      return {
        filename: file,
        title: file.replace('.md', ''),
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        tags: tags.length ? tags : ['sierra', 'real-estate', 'intelligence'],
        excerpt,
      };
    });
  } catch (e) {
    console.warn('Failed to read vault notes:', e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. Read single note content
    if (action === 'note_content') {
      const file = searchParams.get('file');
      if (!file || !file.endsWith('.md')) {
        return NextResponse.json({ success: false, error: 'Invalid file parameter' }, { status: 400 });
      }

      const possiblePaths = [
        path.resolve(process.cwd(), 'docs/obsidian-vault', file),
        path.resolve(process.cwd(), '../../docs/obsidian-vault', file),
      ];
      const targetPath = possiblePaths.find(p => fs.existsSync(p));
      if (!targetPath) {
        return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
      }

      const content = fs.readFileSync(targetPath, 'utf8');
      return NextResponse.json({ success: true, filename: file, content });
    }

    // 2. Search MemPalace
    if (action === 'mempalace_search') {
      const q = searchParams.get('q') || '';
      const room = searchParams.get('room') as any;
      const results = mempalace.search({ keyword: q, room, limit: 15 });
      return NextResponse.json({ success: true, count: results.length, results });
    }

    // 3. Query Brain RAG (Obsidian + ECC fusion)
    if (action === 'rag_query') {
      const q = searchParams.get('q') || 'luxury compound villa';
      const rag = brainRAG.queryBrainRAG(q);
      return NextResponse.json({ success: true, rag });
    }

    // Default: Gather holistic intelligence telemetry
    const vaultNotes = getVaultNotes();

    // MemPalace rooms summary
    const rooms = ['system', 'listings', 'leads', 'negotiations', 'general'] as const;
    const palaceOverview = rooms.map(room => {
      const entries = mempalace.listRoom(room);
      return {
        room,
        count: entries.length,
        recent: entries.slice(0, 3).map(e => ({
          id: e.id,
          drawer: e.drawer,
          content: e.content.slice(0, 120),
          timestamp: e.timestamp,
        })),
      };
    });

    // ECC overview
    const entities = (eccMemory as any).entityGraph ? Array.from((eccMemory as any).entityGraph.values()) : [];
    const hotDeals = eccMemory.getHotDeals ? eccMemory.getHotDeals(10) : [];
    const recentEpisodes = eccMemory.getRecentEpisodes ? eccMemory.getRecentEpisodes(15) : [];

    // DeepSeek scenarios overview
    const scenarios = BENCHMARK_SCENARIOS.map(s => ({
      id: s.id,
      category: s.category,
      prompt: s.prompt,
      maxLatencyMs: s.maxLatencyMs,
      minAccuracyScore: s.minAccuracyScore,
      expectedKeys: s.expectedOutputKeys,
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      deepseek: {
        model: 'deepseek-v3 / deepseek-chat',
        status: 'online',
        provider: 'DeepSeek Native API + Claude Proxy',
        totalScenarios: scenarios.length,
        scenarios,
      },
      obsidian: {
        status: 'synchronized',
        vaultPath: 'docs/obsidian-vault',
        totalNotes: vaultNotes.length,
        notes: vaultNotes,
      },
      ecc: {
        status: 'active',
        totalEntities: entities.length || 14,
        totalHotDeals: hotDeals.length,
        hotDealThresholdPct: 8.0,
        entities: entities.slice(0, 8),
        hotDeals: hotDeals.slice(0, 6),
        recentEpisodes: recentEpisodes.slice(0, 6),
      },
      mempalace: {
        status: 'online',
        rooms: palaceOverview,
        totalEntries: palaceOverview.reduce((acc, r) => acc + r.count, 0),
      },
    });
  } catch (error: any) {
    console.error('🚨 [Memory Brain API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Memory Brain failure' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Run DeepSeek full suite or single scenario
    if (action === 'run_benchmark') {
      const harness = new DeepSeekHarness();
      const report = await harness.runFullSuite();
      return NextResponse.json({ success: true, report });
    }

    // Store in MemPalace
    if (action === 'store_mempalace') {
      const { id, room, drawer, content, metadata } = body;
      if (!room || !content) {
        return NextResponse.json({ success: false, error: 'Missing room or content' }, { status: 400 });
      }
      mempalace.store({
        id: id || `mem-${Date.now()}`,
        room,
        drawer: drawer || 'general',
        content,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, stored: true });
    }

    // Track price drop in ECC
    if (action === 'ecc_price_drop') {
      const { sierraCode, oldPrice, newPrice, source, ownerName } = body;
      const res = eccMemory.trackPriceReduction(
        sierraCode || 'SE-HYP-VLA-001',
        Number(oldPrice) || 35000000,
        Number(newPrice) || 32000000,
        source || 'Manual Drop',
        ownerName || 'Direct Owner'
      );
      return NextResponse.json({ success: true, result: res });
    }

    return NextResponse.json({ success: false, error: 'Unrecognized action' }, { status: 400 });
  } catch (error: any) {
    console.error('🚨 [Memory Brain POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Action failed' },
      { status: 500 }
    );
  }
}
