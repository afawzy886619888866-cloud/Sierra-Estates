import pino from 'pino';
import { obsidian } from '../../obsidian/src/index';
import { getSupabaseAdmin, toRecord } from '@sierra-estates/db';

const logger = pino({ name: 'reportTools' });

export interface AirtableConfig {
  apiKey?: string;
  baseId?: string;
  tableName?: string;
}

export function isRealInventoryListing(memory: { tags?: string[]; value?: Record<string, unknown> }): boolean {
  const tags = new Set(memory.tags ?? []);
  if (!tags.has('inventory-listing') || tags.has('task-execution') || tags.has('shared-knowledge')) {
    return false;
  }

  const item = memory.value ?? {};
  return Boolean(
    item.sourceType === 'owner' ||
    item.sourceType === 'broker' ||
    item.sourceType === 'archive' ||
    item.price ||
    item.egpM ||
    item.area_sqm ||
    item.area ||
    item.bedrooms ||
    item.beds ||
    item.compound ||
    item.propertyType,
  );
}

/**
 * Generates an executive inventory report from Obsidian memory & Airtable.
 */
export async function generateInventoryReport(config: AirtableConfig): Promise<string> {
  logger.info({ msg: 'Tool: generateInventoryReport' });
  
  try {
    const memoryListings = (await obsidian.search('', ['inventory-listing']))
      .filter(isRealInventoryListing);
    
    if (memoryListings && memoryListings.length > 0) {
      let report = `📊 *Sierra Estates — Strategic Real Inventory Report (${memoryListings.length} Active Real Properties)*\n\n`;
      
      memoryListings.slice(-15).reverse().forEach((m: any, i: number) => {
        const item = m.value;
        const code = item.sierraCode || item.code || m.id;
        const price = item.price ? Number(item.price).toLocaleString() : (item.egpM ? `${item.egpM}M` : 'N/A');
        const type = item.type || item.propertyType || 'Unit';
        const loc = item.location || item.compound || 'New Cairo';
        const beds = item.bedrooms || item.beds || item.rooms || '-';
        const area = item.area_sqm || item.area || '-';
        const score = item.valuationScore || item.aiScore || item.intelligence?.valuationScore || 80;

        report += `${i + 1}. *[${code}]* ${type} in *${loc}*\n`;
        report += `   💰 Price: ${price} ${item.currency || 'EGP'} | 📐 ${area} sqm | 🛏️ ${beds} Beds\n`;
        report += `   ⭐ Valuation Score: ${score}/100 | Source: ${item.source || item.sourceGroup || 'Master Sheet'}\n\n`;
      });

      return report.trim();
    }

    const { data: supabaseListings, error } = await getSupabaseAdmin()
      .from('listings')
      .select('id, ref_id, code, property_type, compound, location_area, price, price_currency, bedrooms, area_sqm')
      .eq('status', 'active')
      .limit(15);

    if (error) throw new Error(`Supabase inventory query failed: ${error.message}`);
    if (supabaseListings && supabaseListings.length > 0) {
      let report = `📊 *Sierra Estates — Supabase Inventory Report (${supabaseListings.length} Active Properties)*\n\n`;
      supabaseListings.map((listing) => toRecord<Record<string, unknown>>(listing)).forEach((item, i) => {
        const code = item.sierraCode || item.code || item.id || `listing-${i + 1}`;
        const price = item.price ? Number(item.price).toLocaleString() : 'N/A';
        const type = item.type || item.propertyType || 'Unit';
        const loc = item.location || item.compound || 'New Cairo';
        const beds = item.bedrooms || item.beds || item.rooms || '-';
        const area = item.area_sqm || item.area || '-';
        report += `${i + 1}. *[${code}]* ${type} in *${loc}*\n`;
        report += `   💰 Price: ${price} ${item.currency || 'EGP'} | 📐 ${area} sqm | 🛏️ ${beds} Beds\n\n`;
      });
      return report.trim();
    }

    // Fallback: Check Airtable if configured
    if (config.apiKey && config.baseId && config.tableName) {
      const encodedTableName = encodeURIComponent(config.tableName);
      const response = await fetch(`https://api.airtable.com/v0/${config.baseId}/${encodedTableName}?maxRecords=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json() as { records?: Array<{ fields: Record<string, any> }> };
        const records = data.records || [];
        if (records.length > 0) {
          let report = `📊 *Inventory Report (Top ${records.length})*\n\n`;
          records.forEach((r: any, i: number) => {
            const f = r.fields;
            report += `${i + 1}. *${f['Property Type'] || 'Unit'} in ${f['Location'] || 'Unknown'}*\n`;
            report += `   - Price: ${f['Price'] ? f['Price'].toLocaleString() : 'N/A'} ${f['Currency'] || ''}\n`;
            report += `   - Size: ${f['Area (sqm)']} sqm, ${f['Bedrooms']} Beds\n`;
          });
          return report;
        }
      }
    }

    return `📊 *Sierra Estates Inventory Report*\nCurrently no inventory records found. Use \`openclaw:task "ingest ..."\` to ingest WhatsApp listings.`;
  } catch (error) {
    logger.error({ err: error, msg: 'Failed to generate report' });
    return `Failed to generate report due to an internal error.`;
  }
}
