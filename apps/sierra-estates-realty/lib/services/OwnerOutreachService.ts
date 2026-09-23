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
 */
export function generateOwnerOutreachMessage(owner: OwnerInventoryItem): string {
  const nameGreeting = owner.name && owner.name.trim().length > 1 ? `أستاذ/ة ${owner.name.trim()}` : 'فندم';
  const dealStr = owner.dealType === 'rent' ? 'للإيجار' : 'للبيع';
  const propStr = owner.propertyType || 'الوحدة';
  const compoundStr = owner.compound ? `بكمبوند ${owner.compound}` : 'بالتجمع الخامس';

  return (
    `السلام عليكم ورحمة الله، مرحباً ${nameGreeting} 🌿\n\n` +
    `مع حضرتك سارة من شركة سييرا إستيتس (Sierra Estates) للتسويق العقاري الفاخر بالتجمع الخامس.\n\n` +
    `بخصوص معروضكم الكريم ${compoundStr} (${propStr} المعروضة ${dealStr})، هل الوحدة ما زالت متاحة لدى حضرتك؟\n\n` +
    `لدينا حالياً عملاء VIP جاهزون للمعاينة والتنفيذ الفوري، ويسعدنا التنسيق مع حضرتك وتحديث تفاصيل السعر ونظام السداد.\n\n` +
    `خالص الشكر والتقدير لحضرتك 🤝`
  );
}

export class OwnerOutreachService {
  /**
   * Reads inventory sheets, finding direct owners with valid mobile contacts.
   */
  static async loadEligibleInventory(): Promise<OwnerInventoryItem[]> {
    const items: OwnerInventoryItem[] = [];
    const seenPhones = new Set<string>();

    const possiblePaths = [
      path.resolve(process.cwd(), 'data/master_inventory_clean_no_duplicates.csv'),
      path.resolve(process.cwd(), 'data/Sierra_Estates_Owners_Rent_Master.csv'),
      'H:/Sheets/Final_RealEstate_Database.xlsx',
      'H:/Sheets/Owners_Inventory.json',
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
              compound: compIdx >= 0 ? (row[compIdx] || '').replace(/['"]/g, '').trim() : 'New Cairo',
              zone: zoneIdx >= 0 ? (row[zoneIdx] || '').replace(/['"]/g, '').trim() : 'New Cairo',
              dealType,
              propertyType: typeIdx >= 0 ? (row[typeIdx] || '').replace(/['"]/g, '').trim() : 'Apartment',
              priceEgp: priceIdx >= 0 ? parseFloat((row[priceIdx] || '').replace(/['"]/g, '')) || 0 : 0,
              code: codeIdx >= 0 ? (row[codeIdx] || '').replace(/['"]/g, '').trim() : `SE-O-${i}`,
            });
          }
        } else if (filePath.endsWith('.json')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          const list = Array.isArray(data) ? data : Object.values(data);

          for (let idx = 0; idx < list.length; idx++) {
            const item: any = list[idx];
            const rawPhone = item.mobile || item.phone || item.contact_info || '';
            const e164 = normalizeEgyptPhone(rawPhone);
            if (!e164 || seenPhones.has(e164)) continue;

            seenPhones.add(e164);
            items.push({
              id: item.id || `json-${idx}`,
              name: item.name || '',
              phone: rawPhone,
              e164Phone: e164,
              compound: item.compound || 'New Cairo',
              zone: item.zone || 'New Cairo',
              dealType: (item.deal_type || 'rent').toLowerCase().includes('rent') ? 'rent' : 'sale',
              propertyType: item.property_type || item.type || 'Apartment',
              priceEgp: parseFloat(item.price_egp || item.price) || 0,
              code: item.code || item.sierraCode || `SE-J-${idx}`,
            });
          }
        }
      } catch (err: any) {
        logger.warn(`[OwnerOutreachService] Failed reading ${filePath}:`, err?.message);
      }
    }

    // Also blend in verified Supabase listings if available
    try {
      const dbListings = await listRecords<any>('listings', {
        where: [{ column: 'owner_type', value: 'owner' }],
        limit: 100,
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
            compound: row.compound || 'New Cairo',
            zone: row.zone || 'New Cairo',
            dealType: (row.deal_type || 'sale').toLowerCase() === 'rent' ? 'rent' : 'sale',
            propertyType: row.property_type || 'Apartment',
            priceEgp: parseFloat(row.price_egp || row.price) || 0,
            code: row.sierra_code || row.id,
          });
        }
      }
    } catch {}

    logger.info(`[OwnerOutreachService] Loaded ${items.length} eligible unique owner listings`);
    return items;
  }

  /**
   * Computes the scheduled ISO timestamps distributed across the 12:00 PM to 8:00 PM window.
   */
  static getNextHourlySlot(hourOffset: number = 0): string {
    const now = new Date();
    // Cairo is UTC+2 or UTC+3 depending on DST; use current hour in Africa/Cairo
    const cairoHour = currentHourInZone('Africa/Cairo', now);
    let _targetCairoHour = 12;

    if (cairoHour >= 12 && cairoHour < 20) {
      _targetCairoHour = Math.min(19, cairoHour + hourOffset);
    }


    const scheduled = new Date(now.getTime() + hourOffset * 3600 * 1000);
    return scheduled.toISOString();
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
    } catch {}

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
