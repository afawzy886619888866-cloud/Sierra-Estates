import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { verifyRequest, verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { getSupabaseAdmin } from '@/lib/supabase';

const execAsync = promisify(exec);

interface RegistryEntry {
  phone: string;
  displayPhone: string;
  ownerName: string;
  unitCode: string;
  compound: string;
  price: string;
  bedrooms: string;
  dealType: string;
  areaSqm: string;
  category: string;
  label: string;
  replyText: string;
  mediaCount: number;
  outreachAt: string;
  lastStatusAt: string;
  lastStatusDate: string;
  session: string;
  source: string;
  notes?: string;
}

interface RegistryBreakdown {
  available: number;
  negotiating: number;
  broker: number;
  unavailable: number;
  blocked: number;
  opt_out: number;
  no_reply: number;
  general_reply: number;
}

interface RegistryTabsCount {
  available: number;
  negotiating: number;
  brokers: number;
  inactive: number;
  no_reply: number;
  general_reply: number;
}

interface RegistryPayload {
  stats: {
    totalContacted: number;
    totalReplied: number;
    responseRate: string;
    breakdown: RegistryBreakdown;
    generatedAt: string;
    generatedDate: string;
  };
  tabs: RegistryTabsCount;
  registry: RegistryEntry[];
}

const LABELS: Record<string, string> = {
  available: 'الوحدة متاحة / تفاصيل مالك',
  negotiating: 'تفاوض / تفاصيل مالية',
  broker: 'بروكر / وسيط',
  unavailable: 'تم البيع أو الإيجار',
  blocked: 'رقم محظور / غير قابل للتسليم',
  opt_out: 'إلغاء اشتراك',
  general_reply: 'رد مالك (رسالة / صوتي)',
  no_reply: 'تم التواصل بدون رد',
};

const CAT_ORDER: Record<string, number> = {
  available: 0,
  negotiating: 1,
  general_reply: 2,
  broker: 3,
  unavailable: 4,
  blocked: 5,
  opt_out: 6,
  no_reply: 7,
};

function getCairoDate(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function normalizePhoneDigits(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw).replace(/[^\d+]/g, '').replace(/^\+/, '').replace(/^00/, '');
  if (/^0[12]/.test(s)) s = '20' + s.slice(1);
  return s;
}

function toDisplayPhone(norm: string): string {
  if (!norm || norm.startsWith('LID:')) return norm;
  if (norm.startsWith('20') && norm.length === 12) return '0' + norm.slice(2);
  return norm;
}

function computeBreakdownAndTabs(registry: RegistryEntry[]): {
  breakdown: RegistryBreakdown;
  tabs: RegistryTabsCount;
} {
  const breakdown: RegistryBreakdown = {
    available: registry.filter((r) => r.category === 'available').length,
    negotiating: registry.filter((r) => r.category === 'negotiating').length,
    broker: registry.filter((r) => r.category === 'broker').length,
    unavailable: registry.filter((r) => r.category === 'unavailable').length,
    blocked: registry.filter((r) => r.category === 'blocked').length,
    opt_out: registry.filter((r) => r.category === 'opt_out').length,
    no_reply: registry.filter((r) => r.category === 'no_reply').length,
    general_reply: registry.filter((r) => r.category === 'general_reply').length,
  };
  const tabs: RegistryTabsCount = {
    available: breakdown.available,
    negotiating: breakdown.negotiating,
    brokers: breakdown.broker,
    inactive: breakdown.unavailable + breakdown.blocked + breakdown.opt_out,
    no_reply: breakdown.no_reply,
    general_reply: breakdown.general_reply,
  };
  return { breakdown, tabs };
}

function mapListingToCategory(status?: string | null, availability?: string | null): string {
  const st = String(status || '').toLowerCase().trim();
  const av = String(availability || '').toLowerCase().trim();
  if (av === 'broker_excluded' || av.includes('broker')) return 'broker';
  if (['sold', 'rented', 'unavailable', 'off-market', 'archived'].includes(st) || ['sold', 'rented', 'unavailable', 'not available'].includes(av)) {
    return 'unavailable';
  }
  if (st === 'available' || av === 'available') return 'available';
  return 'no_reply';
}

async function loadFromSupabaseFallback(): Promise<RegistryPayload> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from('listings')
    .select('code,unit_code,owner_name,owner_phone,compound,location_area,price,bedrooms,deal_type,status,availability,updated_at,created_at')
    .not('owner_phone', 'is', null)
    .limit(500);

  if (error) {
    throw new Error(`Supabase fallback query failed: ${error.message}`);
  }

  const byPhone = new Map<string, RegistryEntry>();
  for (const row of (rows || []) as Array<Record<string, unknown>>) {
    const rawPhone = typeof row.owner_phone === 'string' ? row.owner_phone : '';
    const phone = normalizePhoneDigits(rawPhone);
    if (!phone || byPhone.has(phone)) continue;
    const category = mapListingToCategory(
      typeof row.status === 'string' ? row.status : null,
      typeof row.availability === 'string' ? row.availability : null
    );
    const updatedAt = String(row.updated_at || row.created_at || '');
    byPhone.set(phone, {
      phone,
      displayPhone: toDisplayPhone(phone),
      ownerName: String(row.owner_name || 'مالك عقار'),
      unitCode: String(row.unit_code || row.code || ''),
      compound: String(row.compound || row.location_area || ''),
      price: row.price != null ? String(row.price) : '',
      bedrooms: row.bedrooms != null ? String(row.bedrooms) : '',
      dealType: String(row.deal_type || ''),
      areaSqm: '',
      category,
      label: LABELS[category] || category,
      replyText: '',
      mediaCount: 0,
      outreachAt: String(row.created_at || ''),
      lastStatusAt: updatedAt,
      lastStatusDate: updatedAt ? getCairoDate(new Date(updatedAt)) : '',
      session: '',
      source: 'supabase',
    });
  }

  const registry = Array.from(byPhone.values());
  registry.sort((a, b) => (CAT_ORDER[a.category] ?? 99) - (CAT_ORDER[b.category] ?? 99));
  const { breakdown, tabs } = computeBreakdownAndTabs(registry);
  const totalContacted = registry.length;
  const totalReplied = registry.filter((r) => r.category !== 'no_reply').length;

  return {
    stats: {
      totalContacted,
      totalReplied,
      responseRate: totalContacted > 0 ? `${((totalReplied / totalContacted) * 100).toFixed(1)}%` : '0%',
      breakdown,
      generatedAt: new Date().toISOString(),
      generatedDate: getCairoDate(),
    },
    tabs,
    registry,
  };
}

async function syncTabsDirectlyToSheet(payload: RegistryPayload) {
  const writeUrl = process.env.WF_SHEET_WRITE_URL;
  const writeSecret = process.env.WF_SHEET_WRITE_SECRET;
  if (!writeUrl || !writeSecret) {
    return { ok: false, error: 'Missing WF_SHEET_WRITE_URL or WF_SHEET_WRITE_SECRET', results: [] };
  }

  const registry = payload.registry || [];
  const sheetTabs = [
    { tabName: 'Owner_Feedback_Available', data: registry.filter((r) => r.category === 'available') },
    { tabName: 'Owner_Feedback_Negotiating', data: registry.filter((r) => r.category === 'negotiating') },
    { tabName: 'Excluded_Brokers', data: registry.filter((r) => r.category === 'broker') },
    { tabName: 'Owner_Feedback_Inactive', data: registry.filter((r) => ['unavailable', 'blocked', 'opt_out'].includes(r.category)) },
  ];

  const results: Array<{ tab: string; rows: number; status: string; response?: string; error?: string }> = [];
  for (const { tabName, data } of sheetTabs) {
    if (data.length === 0) {
      results.push({ tab: tabName, rows: 0, status: 'empty' });
      continue;
    }
    try {
      const resp = await fetch(writeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: writeSecret,
          action: 'replace_tab',
          tab: tabName,
          headers: ['Phone', 'Owner Name', 'Unit Code', 'Compound', 'Price', 'Bedrooms', 'Deal Type', 'Category', 'Label', 'Reply Text', 'Media', 'Outreach Date', 'Last Status Date'],
          rows: data.map((r) => [
            r.displayPhone,
            r.ownerName,
            r.unitCode,
            r.compound,
            r.price,
            r.bedrooms,
            r.dealType,
            r.category,
            r.label,
            (r.replyText || '').slice(0, 500),
            r.mediaCount,
            r.outreachAt ? r.outreachAt.slice(0, 10) : '',
            r.lastStatusDate,
          ]),
        }),
        signal: AbortSignal.timeout(30000),
      });
      const text = await resp.text();
      results.push({ tab: tabName, rows: data.length, status: resp.ok ? 'synced' : 'error', response: text.slice(0, 200) });
    } catch (err: unknown) {
      results.push({ tab: tabName, rows: data.length, status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { ok: results.every((r) => r.status !== 'error'), stats: payload.stats, results };
}

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
 * Returns the owner feedback registry (cached or fresh, with Supabase edge fallback).
 */
export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = request.nextUrl;
    const refresh = searchParams.get('refresh') === '1';
    const categoryFilter = searchParams.get('category');
    const tabFilter = searchParams.get('tab');

    let data: RegistryPayload | null = null;
    try {
      const registryPath = path.resolve(process.cwd(), '../../workflows/.state/owner-feedback-registry.json');
      const scriptPath = path.resolve(process.cwd(), '../../workflows/lib/owner-feedback-registry.js');

      if ((refresh || !fs.existsSync(registryPath)) && fs.existsSync(scriptPath)) {
        await execAsync(`node "${scriptPath}"`, {
          cwd: path.resolve(process.cwd(), '../..'),
          timeout: 30000,
          env: { ...process.env },
        });
      }

      if (fs.existsSync(registryPath)) {
        data = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as RegistryPayload;
      }
    } catch {
      // Serverless / edge runtime fallback below
    }

    if (!data) {
      data = await loadFromSupabaseFallback();
    }

    let entries = data.registry || [];

    if (categoryFilter) {
      entries = entries.filter((e) => e.category === categoryFilter);
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
        entries = entries.filter((e) => cats.includes(e.category));
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
 * 1) { action: 'sync_sheet' } -> sync 4 feedback tabs to Google Sheets
 * 2) { phone, category, notes? } -> reclassify entry, update tabs/stats & best-effort Supabase listings sync
 */
export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();

    if (body?.action === 'sync_sheet') {
      let scriptSynced = false;
      try {
        const scriptPath = path.resolve(process.cwd(), '../../workflows/lib/owner-feedback-registry.js');
        if (fs.existsSync(scriptPath)) {
          const { stdout } = await execAsync(`node "${scriptPath}" --sync`, {
            cwd: path.resolve(process.cwd(), '../..'),
            timeout: 45000,
            env: { ...process.env },
          });
          const jsonStart = stdout.indexOf('{');
          if (jsonStart >= 0) {
            const syncResult = JSON.parse(stdout.slice(jsonStart));
            scriptSynced = true;
            return NextResponse.json({ ok: Boolean(syncResult?.ok), syncResult });
          }
        }
      } catch {
        // Fall through to direct fetch sync
      }

      if (!scriptSynced) {
        let payload: RegistryPayload | null = null;
        try {
          const registryPath = path.resolve(process.cwd(), '../../workflows/.state/owner-feedback-registry.json');
          if (fs.existsSync(registryPath)) {
            payload = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as RegistryPayload;
          }
        } catch {
          // ignore
        }
        if (!payload) {
          payload = await loadFromSupabaseFallback();
        }
        const syncResult = await syncTabsDirectlyToSheet(payload);
        return NextResponse.json({ ok: Boolean(syncResult.ok), syncResult });
      }
    }

    const { phone, category, notes } = body as { phone?: string; category?: string; notes?: string };

    if (!phone || !category) {
      return NextResponse.json({ error: 'phone and category required' }, { status: 400 });
    }

    const validCategories = ['available', 'negotiating', 'broker', 'unavailable', 'blocked', 'opt_out', 'general_reply', 'no_reply'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Invalid category: ${category}` }, { status: 400 });
    }

    const registryPath = path.resolve(process.cwd(), '../../workflows/.state/owner-feedback-registry.json');
    if (!fs.existsSync(registryPath)) {
      return NextResponse.json({ error: 'Registry not found — run GET ?refresh=1 first' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as RegistryPayload;
    const entry = (data.registry || []).find((e) => e.phone === phone);
    if (!entry) {
      return NextResponse.json({ error: `Phone ${phone} not found in registry` }, { status: 404 });
    }

    entry.category = category;
    entry.label = LABELS[category] || category;
    entry.lastStatusAt = new Date().toISOString();
    entry.lastStatusDate = getCairoDate();
    if (notes) entry.notes = notes;

    data.registry.sort((a, b) => (CAT_ORDER[a.category] ?? 99) - (CAT_ORDER[b.category] ?? 99));

    const { breakdown, tabs } = computeBreakdownAndTabs(data.registry);
    data.stats.breakdown = breakdown;
    data.tabs = tabs;

    fs.writeFileSync(registryPath, JSON.stringify(data, null, 2), 'utf8');

    let supabaseSynced = false;
    if (entry.unitCode) {
      const listingPatch: Record<string, string> | null =
        category === 'available'
          ? { status: 'available', availability: 'available' }
          : ['unavailable', 'blocked', 'opt_out'].includes(category)
          ? { status: 'unavailable', availability: 'unavailable' }
          : category === 'broker'
          ? { availability: 'broker_excluded' }
          : null;

      if (listingPatch) {
        try {
          const supabase = getSupabaseAdmin();
          const { error: updateErr } = await supabase
            .from('listings')
            .update({ ...listingPatch, updated_at: new Date().toISOString() })
            .or(`unit_code.eq.${entry.unitCode},code.eq.${entry.unitCode}`);
          if (!updateErr) supabaseSynced = true;
        } catch {
          // Best-effort — local registry update still succeeds
        }
      }
    }

    return NextResponse.json({
      ok: true,
      entry,
      stats: data.stats,
      tabs: data.tabs,
      supabaseSynced,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
