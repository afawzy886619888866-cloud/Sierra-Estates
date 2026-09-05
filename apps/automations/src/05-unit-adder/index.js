import { assertDbConfigured, insertRecord, listRecords } from '../lib/db';

/**
 * 05-unit-adder
 *
 * Cleans and deduplicates new units into Firestore.
 */

function generateSBRCode(compound, rooms, isFurnished, price, currency) {
  // SBR Code Pattern: [CompoundCode]-[Rooms][FurnishingCode]-[PriceCode]
  const compoundCode = compound.substring(0, 3).toUpperCase();
  const furnishing = isFurnished ? 'F' : 'U';
  
  // Format price e.g., 1600 -> 1.6K
  let priceStr = '';
  if (price >= 1000000) {
    priceStr = `${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    priceStr = `${(price / 1000).toFixed(1)}K`;
  } else {
    priceStr = price.toString();
  }

  return `${compoundCode}-${rooms}${furnishing}-${priceStr}`;
}

export async function runUnitAdder(rawUnitData) {
  console.log(`[Unit Adder] Processing new unit payload for ${rawUnitData.compound}`);
  
  try {
    if (!assertDbConfigured('Unit Adder')) {
      return {
        success: false,
        status: 'skipped',
        error: 'Supabase is not configured',
        timestamp: new Date().toISOString(),
      };
    }
    
    // Hardcoded Rule 1: Currency Threshold
    // Price < 10,000 → USD ($). Price >= 10,000 → EGP.
    const rawPrice = parseFloat(rawUnitData.price) || 0;
    const currency = rawPrice < 10000 ? 'USD' : 'EGP';
    
    // Hardcoded Rule 2: SBR Code Pattern
    const compound = rawUnitData.compound || 'UNK';
    const rooms = parseInt(rawUnitData.rooms) || 0;
    const isFurnished = rawUnitData.isFurnished === true;
    
    const sbrCode = generateSBRCode(compound, rooms, isFurnished, rawPrice, currency);
    
    // Check for deduplication
    const existingUnits = await listRecords('listings', {
      where: [{ column: 'sbrCode', value: sbrCode }],
      select: 'id',
      limit: 1,
    });

    if (existingUnits.length > 0) {
      console.log(`[Unit Adder] Unit ${sbrCode} already exists. Skipping.`);
      return {
        success: true,
        status: 'duplicate',
        sbrCode,
        currency,
        timestamp: new Date().toISOString()
      };
    }
    
    // Insert new unit. `currency` is `price_currency` on the table, and
    // whatever else the scraper handed us goes in `raw_data` rather than being
    // spread onto columns that may not exist — Firestore accepted any shape,
    // Postgres rejects an unknown column and would lose the whole unit.
    const unit = await insertRecord('listings', {
      compound,
      bedrooms: rooms,
      price: rawPrice,
      priceCurrency: currency,
      sbrCode,
      status: 'available',
      syncSource: 'unit-adder',
      rawData: rawUnitData,
    });
    console.log(`[Unit Adder] Unit added with ID: ${unit.id} and SBR: ${sbrCode}`);

    // Dispatch exchange event (optional telemetry)
    await insertRecord('exchange', {
      type: 'agent_task',
      source: 'workflow',
      status: 'done',
      stepName: 'Unit Adder',
      progress: 100,
      payload: { sbrCode, id: unit.id },
    });
    
    return {
      success: true,
      status: 'inserted',
      id: unit.id,
      sbrCode,
      currency,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Unit Adder] Error processing unit:', error.message);
    return {
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Allow direct execution for testing
if (require.main === module) {
  runUnitAdder({ 
    price: 1600, 
    compound: 'Mivida', 
    rooms: 3, 
    isFurnished: true,
    description: 'Beautiful apartment in Mivida'
  }).then(res => console.log(res)).catch(console.error);
}


