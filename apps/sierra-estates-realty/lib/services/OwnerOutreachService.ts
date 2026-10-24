import fs from 'node:fs';
import path from 'node:path';
import { listRecords } from '@sierra-estates/db';
import {
  startOrContinueOwnerNegotiation,
  getOutreachConfig,
  currentHourInZone,
  type WhatsAppOutreachConfig,
} from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

export interface OwnerInventoryItem {
  id: string;
  name: string;
  phone: string;
  e164Phone: string;
  compound: string;
  zone: string;
  dealType: 'rent' | 'sale';
  propertyType: string;
  priceEgp: number;
  notes?: string;
  code?: string;
}

export interface EnqueueBatchResult {
  totalProcessed: number;
  enqueuedCount: number;
  skippedAlreadyContacted: number;
  skippedInvalidPhone: number;
  jobs: Array<{
    phone: string;
    name: string;
    compound: string;
    negotiationId: string;
    jobId: string;
    scheduledFor: string;
  }>;
}

export interface OutreachStatusSummary {
  config: WhatsAppOutreachConfig;
  currentCairoHour: number;
  isOperatingWindow: boolean;
  totalQueued: number;
  totalSent: number;
  totalFailed: number;
  activeNegotiations: number;
  eligibleInventoryCount: number;
}

/**
 * Normalizes Egyptian mobile phone numbers to strict E.164 (+201xxxxxxxxx).
 */
export function normalizeEgyptPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let local = digits;
  if (local.startsWith('20') && local.length === 12) {
    local = local.slice(2);
  } else if (local.startsWith('0020') && local.length === 14) {
    local = local.slice(4);
  }

  // Egyptian mobile format: 010, 011, 012, 015 followed by 8 digits (11 total with leading 0)
  if (local.startsWith('0') && local.length === 11) {
    const prefix = local.slice(0, 3);
    if (['010', '011', '012', '015'].includes(prefix)) {
      return `+20${local.slice(1)}`;
    }
  }

  if (local.length === 10) {
    const prefix = '0' + local.slice(0, 2);
    if (['010', '011', '012', '015'].includes(prefix)) {
      return `+20${local}`;
    }
  }

  // If already full international 12 digits (201xxxxxxxxx)
  if (digits.length === 12 && digits.startsWith('201')) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Generates an executive, polite Arabic outreach message tailored for New Cairo luxury compound owners.
 * §21 no-fabrication: when compound/type are unknown the message omits the
 * clause — it never claims a compound the record does not carry.
 */
export function generateOwnerOutreachMessage(owner: OwnerInventoryItem): string {
  const nameGreeting = owner.name && owner.name.trim().length > 1 && !owner.name.toLowerCase().includes('owner') && !owner.name.includes('المالك')
    ? `أستاذ/ة ${owner.name.trim()}`
    : 'يا فندم';
  const locationStr = owner.compound ? `في كمبوند ${owner.compound}` : 'بالتجمع الخامس';

  return (
    `السلام عليكم ورحمة الله، مرحباً ${nameGreeting} 🌿\n\n` +
    `مع حضرتك فريق شركة سييرا إستيتس (Sierra Estates) للتسويق العقاري بالتجمع الخامس.\n\n` +
    `بعتذر لحضرتك على الإزعاج، كنا حابين نستفسر لو عند حضرتك وحدة معروضة للإيجار أو البيع ${locationStr}؟ وحابين نتأكد من التفاصيل الحالية من حضرتك مباشرة لو مناسب نتعاون في تسويقها لعملائنا.\n\n` +
    `لو الوحدة غير متاحة حالياً بنعتذر جداً لحضرتك وشكراً لوقتك 🤝\n` +
    `(لعدم استقبال رسائل أخرى، أرسل كلمة "إلغاء")`
  );
}

export class OwnerOutreachService {
  /**
   * Reads inventory, finding direct owners with valid mobile contacts.
   *
   * 2026-10-19 fix: the Windows drive-letter sheet paths were dead on every
   * real host (Vercel/EC2 run Linux) — removed. Canonical source order is now
   * Supabase `listings` (owner-direct rows) first, repo `data/*.csv`
   * exports second (the workflow-09 sheet export lives there). DB errors
   * are logged, never silently swallowed (a silent blend failure would
   * hide the primary source and quietly shrink the outreach pool).
   */
  static async loadEligibleInventory(): Promise<OwnerInventoryItem[]> {
    const items: OwnerInventoryItem[] = [];
    const seenPhones = new Set<string>();

    // 1. Canonical inventory (Supabase owner-direct listings)
    try {
      const dbListings = await listRecords<any>('listings', {
        where: [{ column: 'owner_type', value: 'owner' }],
        limit: 1000,
      });
      for (const row of dbListings) {
        const e164 = normalizeEgyptPhone(row.owner_phone || row.contact_info);
        if (e164 && !seenPhones.has(e164)) {
          seenPhones.add(e164);
          items.push({
            id: row.id,
            name: row.owner_name || '',
            phone: row.owner_phone || '',
            e164Phone: e164,
            compound: row.compound || '',
            zone: row.zone || row.location_area || '',
            dealType: (row.deal_type || row.offer_type || 'sale').toLowerCase() === 'rent' ? 'rent' : 'sale',
            propertyType: row.property_type || '',
            priceEgp: parseFloat(row.price_egp || row.price) || 0,
            code: row.code || row.unit_code || row.id,
          });
        }
      }
      logger.info(`[OwnerOutreachService] Supabase blend: ${items.length} owner-direct listings`);
    } catch (err: any) {
      logger.error('[OwnerOutreachService] Supabase owner-listing blend FAILED (canonical source unavailable):', err?.message ?? err);
    }

    // 2. Repo data exports (Linux-relative — the workflow-09 sheet export)
    const possiblePaths = [
      path.resolve(process.cwd(), 'data/master_inventory_clean_no_duplicates.csv'),
      path.resolve(process.cwd(), 'data/Sierra_Estates_Owners_Rent_Master.csv'),
    ];

    for (const filePath of possiblePaths) {
      if (!fs.existsSync(filePath)) continue;

      try {
        if (filePath.endsWith('.csv')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length < 2) continue;

          const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
          const phoneIdx = header.findIndex((h) => h.includes('mobile') || h.includes('phone'));
          const nameIdx = header.findIndex((h) => h.includes('name'));
          const compIdx = header.findIndex((h) => h.includes('compound'));
          const zoneIdx = header.findIndex((h) => h.includes('zone'));
          const dealIdx = header.findIndex((h) => h.includes('deal_type') || h.includes('deal'));
          const typeIdx = header.findIndex((h) => h.includes('property_type') || h.includes('type'));
          const priceIdx = header.findIndex((h) => h.includes('price_egp') || h.includes('price'));
          const codeIdx = header.findIndex((h) => h.includes('code') || h.includes('no'));

          for (let i = 1; i < lines.length; i++) {
            // Basic CSV row parsing taking care of quoted values
            const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
            const rawPhone = phoneIdx >= 0 ? (row[phoneIdx] || '').replace(/['"]/g, '').trim() : '';
            const e164 = normalizeEgyptPhone(rawPhone);
            if (!e164 || seenPhones.has(e164)) continue;

            seenPhones.add(e164);
            const dealRaw = dealIdx >= 0 ? (row[dealIdx] || '').replace(/['"]/g, '').trim().toLowerCase() : '';
            const dealType: 'rent' | 'sale' = dealRaw.includes('rent') || dealRaw.includes('ايجار') ? 'rent' : 'sale';

            items.push({
              id: `csv-${i}`,
              name: nameIdx >= 0 ? (row[nameIdx] || '').replace(/['"]/g, '').trim() : '',
              phone: rawPhone,
              e164Phone: e164,
              compound: compIdx >= 0 ? (row[compIdx] || '').replace(/['"]/g, '').trim() : '',
              zone: zoneIdx >= 0 ? (row[zoneIdx] || '').replace(/['"]/g, '').trim() : '',
              dealType,
              propertyType: typeIdx >= 0 ? (row[typeIdx] || '').replace(/['"]/g, '').trim() : '',
              priceEgp: priceIdx >= 0 ? parseFloat((row[priceIdx] || '').replace(/['"]/g, '')) || 0 : 0,
              code: codeIdx >= 0 ? (row[codeIdx] || '').replace(/['"]/g, '').trim() : `SE-O-${i}`,
            });
          }
        }
      } catch (err: any) {
        logger.warn(`[OwnerOutreachService] Failed reading ${filePath}:`, err?.message);
      }
    }

    logger.info(`[OwnerOutreachService] Loaded ${items.length} eligible unique owner listings`);
    return items;
  }

  /**
   * Computes the scheduled ISO timestamps distributed across the operating
   * window (12:00–20:00 Africa/Cairo, the canonical config in
   * lib/server/whatsapp-queue.ts).
   *
   * 2026-10-19 fix: the previous version computed a Cairo-window target and
   * then ignored it — jobs scheduled outside the window (nights, early
   * mornings) were dispatched at `now + offset` anyway. Now a slot outside
   * the window rolls forward to the next window opening (12:00 Cairo, same
   * or next day), DST-safe via the Intl wall-clock offset.
   */
  static getNextHourlySlot(hourOffset: number = 0): string {
    const WINDOW_START = 12; // 12:00 Cairo
    const WINDOW_END = 20;   // 20:00 Cairo
    const now = new Date();
    const scheduled = new Date(now.getTime() + hourOffset * 3600 * 1000);

    const cairoHour = currentHourInZone('Africa/Cairo', scheduled);
    if (cairoHour >= WINDOW_START && cairoHour < WINDOW_END) {
      return scheduled.toISOString();
    }

    // Outside the window → roll to the next 12:00 Cairo opening.
    // Full wall-clock round-trip: expressing Cairo's H:M:S as UTC ms and
    // subtracting the actual instant yields the zone offset (DST included).
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(scheduled);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const wallMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    const offset = wallMs - scheduled.getTime();
    const wallDayStart = wallMs - (wallMs % 86400000);
    const days = cairoHour >= WINDOW_END ? 1 : 0; // after 20:00 → tomorrow
    const targetWallMs = wallDayStart + days * 86400000 + WINDOW_START * 3600000;
    const rolled = new Date(targetWallMs - offset);
    return rolled.toISOString();
  }

  /**
   * Enqueues exactly batchSize (default 40) owners into Supabase whatsapp_queue
   * after verifying they have not already been contacted.
   */
  static async enqueueBatch(options: { batchSize?: number; targetHourOffset?: number } = {}): Promise<EnqueueBatchResult> {
    const batchSize = options.batchSize || 40;
    const inventory = await this.loadEligibleInventory();

    // Query already contacted phones from owner_negotiations and whatsapp_queue
    const contactedPhones = new Set<string>();
    try {
      const activeNegotiations = await listRecords<{ ownerPhone: string }>('owner_negotiations', { limit: 1000 });
      activeNegotiations.forEach((n) => n.ownerPhone && contactedPhones.add(normalizeEgyptPhone(n.ownerPhone) || n.ownerPhone));

      const queuedJobs = await listRecords<{ recipientPhone: string }>('whatsapp_queue', { limit: 1000 });
      queuedJobs.forEach((q) => q.recipientPhone && contactedPhones.add(normalizeEgyptPhone(q.recipientPhone) || q.recipientPhone));
    } catch (err: any) {
      logger.warn('[OwnerOutreachService] Could not check prior contacted records:', err?.message);
    }

    const enqueuedJobs: EnqueueBatchResult['jobs'] = [];
    let skippedAlreadyContacted = 0;
    let skippedInvalidPhone = 0;

    const scheduledFor = this.getNextHourlySlot(options.targetHourOffset || 0);

    for (const item of inventory) {
      if (enqueuedJobs.length >= batchSize) break;

      if (!item.e164Phone) {
        skippedInvalidPhone++;
        continue;
      }

      if (contactedPhones.has(item.e164Phone)) {
        skippedAlreadyContacted++;
        continue;
      }

      const body = generateOwnerOutreachMessage(item);

      try {
        const { negotiationId, jobId } = await startOrContinueOwnerNegotiation({
          ownerPhone: item.e164Phone,
          ownerName: item.name,
          unitId: item.code || item.id,
          askingPrice: item.priceEgp,
          body,
        });

        contactedPhones.add(item.e164Phone);
        enqueuedJobs.push({
          phone: item.e164Phone,
          name: item.name,
          compound: item.compound,
          negotiationId,
          jobId,
          scheduledFor,
        });
      } catch (err: any) {
        logger.error(`[OwnerOutreachService] Failed to enqueue for ${item.e164Phone}:`, err);
      }
    }

    logger.info(`[OwnerOutreachService] Enqueued ${enqueuedJobs.length} owner outreach jobs for ${scheduledFor}`);

    return {
      totalProcessed: inventory.length,
      enqueuedCount: enqueuedJobs.length,
      skippedAlreadyContacted,
      skippedInvalidPhone,
      jobs: enqueuedJobs,
    };
  }

  /**
   * Retrieves overall outreach metrics and operating window status.
   */
  static async getStatus(): Promise<OutreachStatusSummary> {
    const config = await getOutreachConfig();
    const currentCairoHour = currentHourInZone(config.timezone);
    const isOperatingWindow = currentCairoHour >= config.operatingHourStart && currentCairoHour < config.operatingHourEnd;

    let totalQueued = 0;
    let totalSent = 0;
    let totalFailed = 0;
    let activeNegotiations = 0;

    try {
      const queued = await listRecords<any>('whatsapp_queue', { where: [{ column: 'status', value: 'queued' }] });
      totalQueued = queued.length;

      const sent = await listRecords<any>('whatsapp_queue', { where: [{ column: 'status', value: 'sent' }] });
      totalSent = sent.length;

      const failed = await listRecords<any>('whatsapp_queue', { where: [{ column: 'status', value: 'failed' }] });
      totalFailed = failed.length;

      const negs = await listRecords<any>('owner_negotiations', {
        where: [{ column: 'status', op: 'in', value: ['contacted', 'negotiating'] }],
      });
      activeNegotiations = negs.length;
    } catch (err: any) {
      logger.error('[OwnerOutreachService] getStatus metrics lookup FAILED (reporting zeros is dishonest — surfacing the error):', err?.message ?? err);
      throw err;
    }

    const inventory = await this.loadEligibleInventory();

    return {
      config,
      currentCairoHour,
      isOperatingWindow,
      totalQueued,
      totalSent,
      totalFailed,
      activeNegotiations,
      eligibleInventoryCount: inventory.length,
    };
  }
}
