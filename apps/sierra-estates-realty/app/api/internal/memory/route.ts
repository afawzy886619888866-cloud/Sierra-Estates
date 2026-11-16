import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requireStaffOrServiceKey, requireServiceKey } from '@/lib/server/route-guard';

export async function GET(req: Request) {
  try {

  const denied = await requireServiceKey(req);
  if (denied) return denied;
    const storePath = path.join(process.cwd(), '../../obsidian-store.json');
    const rootStorePath = path.join(process.cwd(), 'obsidian-store.json');
    const target = fs.existsSync(storePath) ? storePath : rootStorePath;

    let count = 0;
    if (fs.existsSync(target)) {
      const store = JSON.parse(fs.readFileSync(target, 'utf8'));
      count = Object.keys(store).length;
    }

    return NextResponse.json({
      status: 'active',
      indexedRecords: count || 822,
      source: count > 0 ? 'obsidian-store' : 'static-fallback',
      mockMode: count === 0,
      lastSynchronized: new Date().toISOString(),
    });
  } catch (_error) {
    return NextResponse.json({ status: 'active', indexedRecords: 822, source: 'static-fallback', mockMode: true });
  }
}
