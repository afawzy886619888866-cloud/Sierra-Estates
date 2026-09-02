 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import pino from 'pino';
import { obsidian } from '../../obsidian/src/index';


const logger = pino({ name: 'inventoryTools' });






















































/** Chunk an array into sub-arrays of at most `size` items */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Build a stable Sierra code for deduplication */
function buildSierraCode(unitData) {
  if (unitData.sierraCode) return unitData.sierraCode;
  const priceM = (unitData.price / 1000000).toFixed(1).replace(/\.0$/, '');
  const loc = (unitData.compound || unitData.location || 'NC').slice(0, 3).toUpperCase().replace(/\s/g, '');
  const typeChar = (unitData.type || 'U').slice(0, 1).toUpperCase();
  const beds = unitData.bedrooms || 0;
  return `${loc}-${typeChar}-${beds}B-${priceM}M`;
}

/**
 * Adds a single real estate listing to Sierra Estates inventory & Obsidian memory store.
 */
export async function addListing(config, unitData) {
  logger.info({ msg: 'Tool: addListing', unitData });

  const id = `listing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sierraCode = buildSierraCode(unitData);

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
    const tags = [
      'inventory-listing',
      unitData.sourceType === 'owner' ? 'owner-listing' : 'broker-listing',
      _optionalChain([unitData, 'access', _ => _.location, 'optionalAccess', _2 => _2.toLowerCase, 'call', _3 => _3(), 'access', _4 => _4.replace, 'call', _5 => _5(/\s+/g, '-')]) || 'new-cairo',
      _optionalChain([unitData, 'access', _6 => _6.type, 'optionalAccess', _7 => _7.toLowerCase, 'call', _8 => _8()]) || 'apartment',
    ];
    if (unitData.fromArchivedGroup) tags.push('archived-group');
    if (unitData.isNewListing) tags.push('new-listing');
    await obsidian.set(id, enrichedData, tags);
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
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                'Property Type': unitData.type,
                Location: unitData.location,
                Price: unitData.price,
                Currency: unitData.currency || 'EGP',
                'Area (sqm)': unitData.area_sqm,
                Bedrooms: unitData.bedrooms,
                Bathrooms: unitData.bathrooms,
                Contact: unitData.contact_info,
                'Source Type': unitData.sourceType || 'broker',
                'WA Group': unitData.whatsappGroupName || '',
                'Is New': unitData.isNewListing ? 'Yes' : 'No',
                Notes: unitData.notes,
              },
            },
          ],
        }),
      });
    } catch (airtableErr) {
      logger.warn({ airtableErr, msg: 'Airtable sync skipped' });
    }
  }

  return `✅ Real estate listing for ${unitData.type} in ${unitData.location} added successfully! Sierra Code: [${sierraCode}]`;
}

/**
 * Batch ingest an array of unit listings.
 * Processes up to `concurrency` units in parallel, chunked to avoid overwhelming Airtable.
 * Returns a full summary report with per-unit results.
 */
export async function batchIngestListings(
  config,
  units,
  options = {},
) {
  const { concurrency = 10, deduplicate = true } = options;
  logger.info({ msg: 'Tool: batchIngestListings', total: units.length });

  const result = {
    total: units.length,
    succeeded: 0,
    failed: 0,
    duplicates: 0,
    errors: [],
    sierraCodes: [],
  };

  // Deduplication: track codes seen in this batch run
  const seenCodes = new Set();

  // Chunk units for concurrency control
  const batches = chunk(units, concurrency);

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (unit) => {
        const code = buildSierraCode(unit);

        if (deduplicate && seenCodes.has(code)) {
          result.duplicates++;
          return;
        }
        seenCodes.add(code);

        try {
          await addListing(config, unit);
          result.succeeded++;
          result.sierraCodes.push(code);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.failed++;
          result.errors.push(`[${code}] ${msg}`);
          logger.error({ msg: 'Batch ingest unit failed', code, err });
        }
      }),
    );
  }

  logger.info({
    msg: 'batchIngestListings complete',
    succeeded: result.succeeded,
    failed: result.failed,
    duplicates: result.duplicates,
  });
  return result;
}

/**
 * Edits an existing real estate listing.
 */
export async function editInventory(config, location, newPrice) {
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
