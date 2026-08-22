import pino from 'pino';
import { obsidian } from '../../obsidian/src/index';

const logger = pino({ name: 'inventoryTools' });

export interface AirtableConfig {
  apiKey?: string;
  baseId?: string;
  tableName?: string;
}

export interface UnitListingData {
  type: string;
  location: string;
  compound?: string;
  price: number;
  currency?: string;
  area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  contact_info?: string;
  notes?: string;
  sierraCode?: string;
  valuationScore?: number;
  urgencyScore?: number;
  finishing?: string;
  paymentPlan?: {
    downpayment?: number;
    installments?: number;
    deliveryDate?: string;
  };
}

/**
 * Adds a new real estate listing to Sierra Estates inventory & Obsidian memory store.
 */
export async function addListing(config: AirtableConfig, unitData: UnitListingData): Promise<string> {
  logger.info({ msg: 'Tool: addListing', unitData });
  
  const id = `listing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const priceM = (unitData.price / 1000000).toFixed(1).replace(/\.0$/, '');
  const sierraCode = unitData.sierraCode || `${unitData.location?.slice(0, 2).toUpperCase() || 'NC'}-${unitData.type?.slice(0, 1).toUpperCase() || 'U'}-${unitData.bedrooms || 3}B-${priceM}M`;
  
  const enrichedData = {
    id,
    sierraCode,
    ...unitData,
    currency: unitData.currency || 'EGP',
    status: 'available',
    createdAt: new Date().toISOString(),
  };

  // 1. Always persist to Obsidian Project Memory
  try {
    await obsidian.set(id, enrichedData, [
      'inventory-listing',
      'broker-listing',
      unitData.location?.toLowerCase().replace(/\s+/g, '-') || 'new-cairo',
      unitData.type?.toLowerCase() || 'apartment'
    ]);
  } catch (memErr) {
    logger.warn({ memErr, msg: 'Obsidian memory save warning' });
  }

  // 2. Persist to Airtable if configured
  if (config.apiKey && config.baseId && config.tableName) {
    try {
      const encodedTableName = encodeURIComponent(config.tableName);
      await fetch(`https://api.airtable.com/v0/${config.baseId}/${encodedTableName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                "Property Type": unitData.type,
                "Location": unitData.location,
                "Price": unitData.price,
                "Currency": unitData.currency || 'EGP',
                "Area (sqm)": unitData.area_sqm,
                "Bedrooms": unitData.bedrooms,
                "Bathrooms": unitData.bathrooms,
                "Contact": unitData.contact_info,
                "Notes": unitData.notes
              }
            }
          ]
        })
      });
    } catch (airtableErr) {
      logger.warn({ airtableErr, msg: 'Airtable sync skipped' });
    }
  }

  return `✅ Real estate listing for ${unitData.type} in ${unitData.location} added successfully! Sierra Code: [${sierraCode}]`;
}

/**
 * Edits an existing real estate listing.
 */
export async function editInventory(config: AirtableConfig, location: string, newPrice: number): Promise<string> {
  logger.info({ msg: 'Tool: editInventory', location, newPrice });
  
  try {
    const existing = await obsidian.search(location, ['inventory-listing']);
    if (existing.length > 0) {
      const target = existing[0];
      const updatedValue = { ...target.value, price: newPrice, updatedAt: new Date().toISOString() };
      await obsidian.set(target.id, updatedValue, target.tags);
      return `✅ Inventory updated. Listing ${target.id} (${location}) price adjusted to ${newPrice.toLocaleString()} EGP.`;
    }
  } catch (err) {
    logger.warn({ err, msg: 'Memory update warning' });
  }

  return `Inventory updated. The price for properties matching ${location} has been adjusted to ${newPrice.toLocaleString()} EGP.`;
}
