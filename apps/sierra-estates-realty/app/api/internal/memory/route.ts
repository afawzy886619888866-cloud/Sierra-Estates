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

    // §21 honesty: report the real count. No fabricated fallback number.
    return NextResponse.json({
      status: 'active',
      indexedRecords: count,
      source: count > 0 ? 'obsidian-store' : 'empty',
      mockMode: false,
      note: count === 0 ? 'obsidian-store.json absent or empty on this isolate' : undefined,
      lastSynchronized: new Date().toISOString(),
    });
  } catch (_error) {
    return NextResponse.json({
      status: 'active',
      indexedRecords: 0,
      source: 'unavailable',
      mockMode: false,
      note: 'obsidian-store.json not readable on this isolate',
    });
  }
}
