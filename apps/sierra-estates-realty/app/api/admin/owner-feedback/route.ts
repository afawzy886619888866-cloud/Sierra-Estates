import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { verifyRequest, verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';

const execAsync = promisify(exec);

/**
 * Admin authentication guard — every handler must pass through this before
 * touching the registry or spawning the rebuild script.
 */
async function checkAuth(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (auth.authenticated && auth.method === 'secret-key') {
    return null; // internal secret key authorized
  }
  const adminAuth = await verifyAdminRequest(request);
  if (adminAuth.authenticated) {
    return null; // admin session authorized
  }
  return unauthorizedResponse();
}

/**
 * GET /api/admin/owner-feedback
 * Returns the owner feedback registry (cached or fresh).
 *
 * Query params:
 *   ?refresh=1  — rebuild the registry from scratch
 *   ?category=available|broker|...  — filter by category
 *   ?tab=available|negotiating|brokers|inactive|no_reply|general_reply
 */
export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = request.nextUrl;
    const refresh = searchParams.get('refresh') === '1';
    const categoryFilter = searchParams.get('category');
    const tabFilter = searchParams.get('tab');

    // Path to the registry JSON
    const registryPath = path.resolve(process.cwd(), '../../workflows/.state/owner-feedback-registry.json');

    // If refresh requested or file doesn't exist, rebuild
    if (refresh || !fs.existsSync(registryPath)) {
      const scriptPath = path.resolve(process.cwd(), '../../workflows/lib/owner-feedback-registry.js');
      await execAsync(`node "${scriptPath}"`, {
        cwd: path.resolve(process.cwd(), '../..'),
        timeout: 30000,
        env: { ...process.env },
      });
    }

    // Read the registry
    if (!fs.existsSync(registryPath)) {
      return NextResponse.json({ error: 'Registry not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    let entries = data.registry || [];

    // Apply filters
    if (categoryFilter) {
      entries = entries.filter((e: { category: string }) => e.category === categoryFilter);
    }
    if (tabFilter) {
      const tabCategories: Record<string, string[]> = {
        available: ['available'],
        negotiating: ['negotiating'],
        brokers: ['broker'],
        inactive: ['unavailable', 'blocked', 'opt_out'],
        no_reply: ['no_reply'],
        general_reply: ['general_reply'],
      };
      const cats = tabCategories[tabFilter];
      if (cats) {
        entries = entries.filter((e: { category: string }) => cats.includes(e.category));
      }
    }

    return NextResponse.json({
      stats: data.stats,
      tabs: data.tabs,
      entries,
      count: entries.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/owner-feedback
 * Update a single entry's category (manual override).
 *
 * Body: { phone: string, category: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const { phone, category, notes } = body;

    if (!phone || !category) {
      return NextResponse.json({ error: 'phone and category required' }, { status: 400 });
    }

    const validCategories = ['available', 'negotiating', 'broker', 'unavailable', 'blocked', 'opt_out', 'general_reply', 'no_reply'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Invalid category: ${category}` }, { status: 400 });
    }

    // Read registry
    const registryPath = path.resolve(process.cwd(), '../../workflows/.state/owner-feedback-registry.json');
    if (!fs.existsSync(registryPath)) {
      return NextResponse.json({ error: 'Registry not found — run GET ?refresh=1 first' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const entry = (data.registry || []).find((e: { phone: string }) => e.phone === phone);
    if (!entry) {
      return NextResponse.json({ error: `Phone ${phone} not found in registry` }, { status: 404 });
    }

    const labels: Record<string, string> = {
      available: 'الوحدة متاحة / تفاصيل مالك',
      negotiating: 'تفاوض / تفاصيل مالية',
      broker: 'بروكر / وسيط',
      unavailable: 'تم البيع أو الإيجار',
      blocked: 'رقم محظور / غير قابل للتسليم',
      opt_out: 'إلغاء اشتراك',
      general_reply: 'رد مالك (رسالة / صوتي)',
      no_reply: 'تم التواصل بدون رد',
    };

    entry.category = category;
    entry.label = labels[category] || category;
    entry.lastStatusAt = new Date().toISOString();
    entry.lastStatusDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
    if (notes) entry.notes = notes;

    // Re-sort
    const catOrder: Record<string, number> = { available: 0, negotiating: 1, general_reply: 2, broker: 3, unavailable: 4, blocked: 5, opt_out: 6, no_reply: 7 };
    data.registry.sort((a: { category: string }, b: { category: string }) =>
      (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99)
    );

    // Recalculate stats
    data.stats.breakdown = {
      available: data.registry.filter((r: { category: string }) => r.category === 'available').length,
      negotiating: data.registry.filter((r: { category: string }) => r.category === 'negotiating').length,
      broker: data.registry.filter((r: { category: string }) => r.category === 'broker').length,
      unavailable: data.registry.filter((r: { category: string }) => r.category === 'unavailable').length,
      blocked: data.registry.filter((r: { category: string }) => r.category === 'blocked').length,
      opt_out: data.registry.filter((r: { category: string }) => r.category === 'opt_out').length,
      no_reply: data.registry.filter((r: { category: string }) => r.category === 'no_reply').length,
      general_reply: data.registry.filter((r: { category: string }) => r.category === 'general_reply').length,
    };

    // Write back
    fs.writeFileSync(registryPath, JSON.stringify(data, null, 2), 'utf8');

    return NextResponse.json({ ok: true, entry, stats: data.stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
