 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import pino from 'pino';
import { obsidian } from '../../obsidian/src/index';

const logger = pino({ name: 'reportTools' });







/**
 * Generates an executive inventory report from Obsidian memory & Airtable.
 */
export async function generateInventoryReport(config) {
  logger.info({ msg: 'Tool: generateInventoryReport' });
  
  try {
    const memoryListings = await obsidian.search('', ['inventory-listing']);
    
    if (memoryListings && memoryListings.length > 0) {
      let report = `📊 *Sierra Estates — Strategic Real Inventory Report (${memoryListings.length} Active Real Properties)*\n\n`;
      
      memoryListings.slice(-15).reverse().forEach((m, i) => {
        const item = m.value;
        const code = item.sierraCode || item.code || m.id;
        const price = item.price ? Number(item.price).toLocaleString() : (item.egpM ? `${item.egpM}M` : 'N/A');
        const type = item.type || item.propertyType || 'Unit';
        const loc = item.location || item.compound || 'New Cairo';
        const beds = item.bedrooms || item.beds || item.rooms || '-';
        const area = item.area_sqm || item.area || '-';
        const score = item.valuationScore || item.aiScore || _optionalChain([item, 'access', _ => _.intelligence, 'optionalAccess', _2 => _2.valuationScore]) || 80;

        report += `${i + 1}. *[${code}]* ${type} in *${loc}*\n`;
        report += `   💰 Price: ${price} ${item.currency || 'EGP'} | 📐 ${area} sqm | 🛏️ ${beds} Beds\n`;
        report += `   ⭐ Valuation Score: ${score}/100 | Source: ${item.source || item.sourceGroup || 'Master Sheet'}\n\n`;
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
        const data = await response.json();
        const records = data.records || [];
        if (records.length > 0) {
          let report = `📊 *Inventory Report (Top ${records.length})*\n\n`;
          records.forEach((r, i) => {
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
