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

interface DbOwnerListingRecord {
  id: string;
  code?: string | null;
  unitCode?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  contactInfo?: string | null;
  compound?: string | null;
  zone?: string | null;
  locationArea?: string | null;
  dealType?: string | null;
  offerType?: string | null;
  propertyType?: string | null;
  priceEgp?: number | string | null;
  price?: number | string | null;
  status?: string | null;
}

interface DbQueueRow {
  id: string;
  recipientPhone?: string | null;
  status?: string | null;
}

interface DbNegotiationRow {
  id: string;
  ownerPhone?: string | null;
  status?: string | null;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function loadWorkflowOptOuts(): Set<string> {
  const optedOut = new Set<string>();
  const optOutPath = path.resolve(process.cwd(), 'workflows/.state/owner-outreach-optouts.jsonl');
  if (!fs.existsSync(optOutPath)) return optedOut;
  try {
    const lines = fs.readFileSync(optOutPath, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as { phone?: string; e164?: string };
        const norm = normalizeEgyptPhone(parsed.e164 || parsed.phone || '');
        if (norm) optedOut.add(norm);
      } catch (parseErr: unknown) {
        logger.debug('[OwnerOutreachService] Malformed opt-out jsonl entry skipped:', errorMessage(parseErr));
      }
    }
  } catch (err: unknown) {
    logger.warn('[OwnerOutreachService] Failed reading workflow opt-out ledger:', errorMessage(err));
  }
  return optedOut;
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
   * Canonical source order:
   * 1. Supabase `public.listings` rows carrying direct-owner `source_channel`
   *    (`Direct Owner`, `sheets`, `owner_direct`) with valid `owner_phone`.
   * 2. Repo `data/*.csv` exports (workflow-09 sheet exports).
   */
  static async loadEligibleInventory(): Promise<OwnerInventoryItem[]> {
    const items: OwnerInventoryItem[] = [];
    const seenPhones = new Set<string>();
    const optedOut = loadWorkflowOptOuts();

    // 1. Canonical inventory (Supabase owner-direct listings via live source_channel column)
    try {
      const dbListings = await listRecords<DbOwnerListingRecord>('listings', {
        where: [
          { column: 'source_channel', op: 'in', value: ['Direct Owner', 'sheets', 'owner_direct'] },
        ],
        limit: 1500,
      });
      for (const row of dbListings) {
        const statusLower = String(row.status || 'available').toLowerCase();
        if (statusLower === 'sold' || statusLower === 'off-market' || statusLower === 'archived') {
          continue;
        }
        const rawPhone = row.ownerPhone || row.contactInfo || '';
        const e164 = normalizeEgyptPhone(rawPhone);
        if (e164 && !seenPhones.has(e164) && !optedOut.has(e164)) {
          seenPhones.add(e164);
          const rawDeal = String(row.dealType || row.offerType || 'sale').toLowerCase();
          const numericPrice = Number(row.priceEgp ?? row.price ?? 0);
          items.push({
            id: row.id,
            name: row.ownerName || '',
            phone: rawPhone,
            e164Phone: e164,
            compound: row.compound || '',
            zone: row.zone || row.locationArea || '',
            dealType: rawDeal === 'rent' ? 'rent' : 'sale',
            propertyType: row.propertyType || '',
            priceEgp: Number.isFinite(numericPrice) ? numericPrice : 0,
            code: row.code || row.unitCode || row.id,
          });
        }
      }
      logger.info(`[OwnerOutreachService] Supabase blend: ${items.length} owner-direct listings`);
    } catch (err: unknown) {
      logger.error('[OwnerOutreachService] Supabase owner-listing blend FAILED (canonical source unavailable):', errorMessage(err));
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
            const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
            const rawPhone = phoneIdx >= 0 ? (row[phoneIdx] || '').replace(/['"]/g, '').trim() : '';
            const e164 = normalizeEgyptPhone(rawPhone);
            if (!e164 || seenPhones.has(e164) || optedOut.has(e164)) continue;

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
      } catch (err: unknown) {
        logger.warn(`[OwnerOutreachService] Failed reading ${filePath}:`, errorMessage(err));
      }
    }

    logger.info(`[OwnerOutreachService] Loaded ${items.length} eligible unique owner listings`);
    return items;
  }

  /**
   * Computes the scheduled ISO timestamps distributed across the operating
   * window (12:00–20:00 Africa/Cairo, the canonical config in
   * lib/server/whatsapp-queue.ts).
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

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(scheduled);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const wallMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    const offset = wallMs - scheduled.getTime();
    const wallDayStart = wallMs - (wallMs % 86400000);
    const days = cairoHour >= WINDOW_END ? 1 : 0;
    const targetWallMs = wallDayStart + days * 86400000 + WINDOW_START * 3600000;
    let rolled = new Date(targetWallMs - offset);
    const rolledParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(rolled);
    const getRolled = (t: string) => Number(rolledParts.find((p) => p.type === t)?.value ?? 0);
    const rolledWallMs = Date.UTC(
      getRolled('year'),
      getRolled('month') - 1,
      getRolled('day'),
      getRolled('hour') % 24,
      getRolled('minute'),
      getRolled('second'),
    );
    const rolledOffset = rolledWallMs - rolled.getTime();
    if (rolledOffset !== offset) {
      rolled = new Date(targetWallMs - rolledOffset);
    }
    return rolled.toISOString();
  }

  /**
   * Enqueues up to batchSize (default 40) owners into Supabase whatsapp_queue
   * after verifying they have not already been contacted or opted out.
   */
  static async enqueueBatch(options: { batchSize?: number; targetHourOffset?: number } = {}): Promise<EnqueueBatchResult> {
    const batchSize = options.batchSize || 40;
    const inventory = await this.loadEligibleInventory();
    const optedOut = loadWorkflowOptOuts();

    const contactedPhones = new Set<string>();
    try {
      const activeNegotiations = await listRecords<DbNegotiationRow>('owner_negotiations', { limit: 1000 });
      activeNegotiations.forEach((n) => {
        if (n.ownerPhone) {
          contactedPhones.add(normalizeEgyptPhone(n.ownerPhone) || n.ownerPhone);
        }
      });

      const queuedJobs = await listRecords<DbQueueRow>('whatsapp_queue', { limit: 1000 });
      queuedJobs.forEach((q) => {
        if (q.recipientPhone) {
          contactedPhones.add(normalizeEgyptPhone(q.recipientPhone) || q.recipientPhone);
        }
      });
    } catch (err: unknown) {
      logger.warn('[OwnerOutreachService] Could not check prior contacted records:', errorMessage(err));
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

      if (contactedPhones.has(item.e164Phone) || optedOut.has(item.e164Phone)) {
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
      } catch (err: unknown) {
        logger.error(`[OwnerOutreachService] Failed to enqueue for ${item.e164Phone}:`, errorMessage(err));
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
      const queued = await listRecords<DbQueueRow>('whatsapp_queue', { where: [{ column: 'status', value: 'queued' }] });
      totalQueued = queued.length;

      const sent = await listRecords<DbQueueRow>('whatsapp_queue', { where: [{ column: 'status', value: 'sent' }] });
      totalSent = sent.length;

      const failed = await listRecords<DbQueueRow>('whatsapp_queue', { where: [{ column: 'status', value: 'failed' }] });
      totalFailed = failed.length;

      const negs = await listRecords<DbNegotiationRow>('owner_negotiations', {
        where: [{ column: 'status', op: 'in', value: ['contacted', 'negotiating'] }],
      });
      activeNegotiations = negs.length;
    } catch (err: unknown) {
      logger.error('[OwnerOutreachService] getStatus metrics lookup FAILED (reporting zeros is dishonest — surfacing the error):', errorMessage(err));
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

  /**
   * Daily Outreach & Response Intelligence Report
   * Reads contacted owners from data/outreach_contacted_units.csv and
   * inbound responses from data/outreach_respondent_owners.csv.
   */
  static async getDailyReport(targetDate?: string) {
    const cairoDate = targetDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());

    const rootCandidates = [
      path.resolve(process.cwd(), '..', '..'),
      path.resolve(process.cwd(), '..'),
      process.cwd(),
      'h:/Sierra Estates',
      'H:/Sierra Estates'
    ];

    let contactedCsvPath: string | null = null;
    let respondentsCsvPath: string | null = null;

    for (const r of rootCandidates) {
      const c = path.join(r, 'data', 'outreach_contacted_units.csv');
      if (!contactedCsvPath && fs.existsSync(c)) contactedCsvPath = c;

      const resp = path.join(r, 'data', 'outreach_respondent_owners.csv');
      if (!respondentsCsvPath && fs.existsSync(resp)) respondentsCsvPath = resp;
    }

    const contactedMap = new Map<string, any>();
    let totalHistorical = 0;
    let todayContactedCount = 0;

    if (contactedCsvPath && fs.existsSync(contactedCsvPath)) {
      try {
        const raw = fs.readFileSync(contactedCsvPath, 'utf8');
        const lines = raw.split('\n').filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((s) => s.replace(/^"|"$/g, '').trim());
          if (parts.length >= 8) {
            const [code, name, rawPhone, location, price, bedrooms, dealType, contactDate, session] = parts;
            const cleanPhone = String(rawPhone).replace(/\D/g, '').replace(/^00/, '').replace(/^0/, '20');
            contactedMap.set(cleanPhone, {
              code, name, phone: cleanPhone, location, price, bedrooms, dealType, contactDate, session,
            });
            totalHistorical++;
            if (contactDate && (contactDate.includes(cairoDate) || contactDate.includes(cairoDate.split('-').reverse().join('/')))) {
              todayContactedCount++;
            }
          }
        }
      } catch (err: any) {
        logger.warn(`[OwnerOutreachService] Failed reading contacted CSV: ${err.message}`);
      }
    }

    const respondents: any[] = [];
    if (respondentsCsvPath && fs.existsSync(respondentsCsvPath)) {
      try {
        const raw = fs.readFileSync(respondentsCsvPath, 'utf8');
        const lines = raw.split('\n').filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((s) => s.replace(/^"|"$/g, '').trim());
          if (parts.length >= 8) {
            const [code, ownerName, phone, compound, price, bedrooms, dealType, category, replyLabel, replyText, replyTime] = parts;
            respondents.push({
              code, ownerName, phone, compound, price, bedrooms, dealType, category, replyLabel, replyText, replyTime,
            });
          }
        }
      } catch (err: any) {
        logger.warn(`[OwnerOutreachService] Failed reading respondents CSV: ${err.message}`);
      }
    }

    const totalSent = todayContactedCount > 0 ? todayContactedCount : (totalHistorical > 0 ? totalHistorical : 0);
    const totalAnswered = respondents.length;
    const responseRate = totalSent > 0 ? ((totalAnswered / totalSent) * 100).toFixed(1) + '%' : '0.0%';

    const breakdown = {
      available: respondents.filter((r) => r.category === 'available').length,
      unavailable: respondents.filter((r) => r.category === 'unavailable').length,
      negotiating: respondents.filter((r) => r.category === 'negotiating').length,
      opt_out: respondents.filter((r) => r.category === 'opt_out').length,
      general_reply: respondents.filter((r) => !['available', 'unavailable', 'negotiating', 'opt_out'].includes(r.category)).length,
    };

    return {
      date: cairoDate,
      totalHistorical,
      totalSentToday: todayContactedCount,
      totalSent,
      targetDaily: 400,
      totalAnswered,
      responseRate,
      breakdown,
      respondents,
      contactedCount: contactedMap.size,
    };
  }
}
