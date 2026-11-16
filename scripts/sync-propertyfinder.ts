import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import { propertyFinderConnector } from '../packages/property-finder-api/src/connector';
import { listAtlasLeads, type PropertyFinderAtlasLead } from '../packages/property-finder-api/src/index';

const logger = pino({ name: 'sync-propertyfinder-script' });

function loadEnvFiles(): void {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptDir, '..');
  for (const rel of ['.env.local', '.env']) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

function extractLeadPhone(lead: PropertyFinderAtlasLead): string | null {
  const contacts = lead.sender?.contacts || [];
  for (const c of contacts) {
    const val = String(c.value || '').trim();
    if (val && /\d{8,}/.test(val)) return val;
  }
  return null;
}

function extractLeadEmail(lead: PropertyFinderAtlasLead): string | null {
  const contacts = lead.sender?.contacts || [];
  for (const c of contacts) {
    const val = String(c.value || '').trim();
    if (val.includes('@')) return val;
  }
  return null;
}

async function syncRecentAtlasLeads(): Promise<{ fetched: number; inserted: number; skippedExisting: number }> {
  const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const hasAtlas = Boolean(process.env.PROPERTY_FINDER_API_KEY && process.env.PROPERTY_FINDER_API_SECRET);
  if (!sbUrl || !sbKey || !hasAtlas) {
    return { fetched: 0, inserted: 0, skippedExisting: 0 };
  }

  const supabase = createClient(sbUrl, sbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: atlasLeads } = await listAtlasLeads({ perPage: 25, page: 1 });
  let inserted = 0;
  let skippedExisting = 0;

  for (const lead of atlasLeads) {
    if (!lead.id) continue;
    const phone = extractLeadPhone(lead);
    if (!phone) continue;

    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('pf_lead_id', String(lead.id))
      .limit(1);

    if (existing && existing.length > 0) {
      skippedExisting++;
      continue;
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('leads').insert({
      full_name: lead.sender?.name || 'Property Finder Client',
      phone,
      email: extractLeadEmail(lead),
      source: 'property_finder',
      origin_channel: `pf-atlas-${lead.channel || 'portal'}`,
      pf_lead_id: String(lead.id),
      pf_listing_reference_number: lead.listing?.reference || null,
      asset_reference: lead.listing?.reference || null,
      lead_type: 'buyer',
      stage: 'inbound',
      status: 'new',
      summary_notes: `Synced from Property Finder Enterprise Atlas (${lead.channel || 'lead'})`,
      created_at: lead.createdAt || nowIso,
      updated_at: nowIso,
    });

    if (!error) inserted++;
  }

  return { fetched: atlasLeads.length, inserted, skippedExisting };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const useLive = Boolean(process.env.PROPERTY_FINDER_API_KEY && process.env.PROPERTY_FINDER_API_SECRET);
  logger.info({ useLive }, 'Starting PropertyFinder automated catalog & lead synchronization...');
  const start = Date.now();

  try {
    const result = await propertyFinderConnector.syncCatalog({ limit: 50, live: useLive });
    const leadStats = useLive
      ? await syncRecentAtlasLeads().catch((err: unknown) => {
          logger.warn({ err }, 'Atlas lead sync warning (non-fatal)');
          return { fetched: 0, inserted: 0, skippedExisting: 0 };
        })
      : { fetched: 0, inserted: 0, skippedExisting: 0 };

    logger.info({
      msg: 'PropertyFinder catalog sync completed successfully',
      syncId: result.syncId,
      mockMode: result.mockMode,
      totalFetched: result.totalFetched,
      totalSynced: result.totalSynced,
      totalRemoteAvailable: result.totalRemoteAvailable,
      leadStats,
      durationMs: Date.now() - start,
    });

    console.log(`\n[✓] PropertyFinder sync completed in ${Date.now() - start}ms (mode=${result.mockMode ? 'MOCK' : 'LIVE ATLAS v1'}).`);
    console.log(`[✓] Synced ${result.totalSynced} listings (total live on PF account: ${result.totalRemoteAvailable ?? result.totalSynced}).`);
    if (useLive) {
      console.log(`[✓] Atlas leads checked: ${leadStats.fetched} (${leadStats.inserted} new inserted, ${leadStats.skippedExisting} already in Supabase).\n`);
    }
  } catch (error) {
    logger.error({ err: error, msg: 'PropertyFinder catalog sync failed' });
    process.exit(1);
  }
}

void main();
