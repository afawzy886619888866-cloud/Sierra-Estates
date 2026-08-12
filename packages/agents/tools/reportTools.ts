import pino from 'pino';

const logger = pino({ name: 'reportTools' });

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

/**
 * Generates a team report about inventory.
 */
export async function generateInventoryReport(config: AirtableConfig): Promise<string> {
  logger.info({ msg: 'Tool: generateInventoryReport' });
  
  try {
    const encodedTableName = encodeURIComponent(config.tableName);
    const response = await fetch(`https://api.airtable.com/v0/${config.baseId}/${encodedTableName}?maxRecords=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    if (!response.ok) {
      return `Failed to generate report. Could not fetch data from database.`;
    }

    const data = await response.json();
    const records = data.records || [];
    
    if (records.length === 0) {
      return `📊 *Inventory Report*\nCurrently, there are no listings in the database.`;
    }

    let report = `📊 *Inventory Report (Top ${records.length})*\n\n`;
    records.forEach((r: any, i: number) => {
      const f = r.fields;
      report += `${i + 1}. *${f['Property Type'] || 'Unit'} in ${f['Location'] || 'Unknown'}*\n`;
      report += `   - Price: ${f['Price'] ? f['Price'].toLocaleString() : 'N/A'} ${f['Currency'] || ''}\n`;
      report += `   - Size: ${f['Area (sqm)']} sqm, ${f['Bedrooms']} Beds\n`;
    });

    return report;
  } catch (error) {
    logger.error({ err: error, msg: 'Failed to generate report' });
    return `Failed to generate report due to a network error.`;
  }
}
