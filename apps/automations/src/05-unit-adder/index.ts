import {
  assertDbConfigured,
  insertRecord,
  listRecords,
  classifyError,
  withBoundedRetry,
} from '../lib/db';

/**
 * 05-unit-adder
 *
 * Cleans, validates, and deduplicates new units into the canonical Supabase listings table
 * with bounded retries and classified error diagnostics.
 */

export interface UnitAdderResult {
  success: boolean;
  status: 'inserted' | 'duplicate' | 'validation_error' | 'skipped' | 'error';
  id?: string;
  sbrCode?: string;
  currency?: string;
  category?: string;
  error?: string;
  timestamp: string;
}

export function generateSBRCode(compound: string, rooms: number, isFurnished: boolean, price: number, currency: string) {
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

export async function runUnitAdder(rawUnitData: any): Promise<UnitAdderResult> {
  const timestamp = new Date().toISOString();
  if (!rawUnitData || typeof rawUnitData !== 'object') {
    return {
      success: false,
      status: 'validation_error',
      category: 'validation_error',
      error: 'Missing unit data payload',
      timestamp,
    };
  }

  const rawPrice = parseFloat(rawUnitData.price);
  if (isNaN(rawPrice) || rawPrice <= 0) {
    return {
      success: false,
      status: 'validation_error',
      category: 'validation_error',
      error: 'Price must be a positive number',
      timestamp,
    };
  }

  const compound = (rawUnitData.compound || '').trim();
  if (!compound) {
    return {
      success: false,
      status: 'validation_error',
      category: 'validation_error',
      error: 'Compound name is required',
      timestamp,
    };
  }

  console.log(`[Unit Adder] Processing new unit payload for ${compound}`);
  
  try {
    if (!assertDbConfigured('Unit Adder')) {
      return {
        success: false,
        status: 'skipped',
        category: 'auth_failure',
        error: 'Supabase is not configured',
        timestamp,
      };
    }
    
    // Hardcoded Rule 1: Currency Threshold
    // Price < 10,000 → USD ($). Price >= 10,000 → EGP.
    const currency = rawPrice < 10000 ? 'USD' : 'EGP';
    
    // Hardcoded Rule 2: SBR Code Pattern
    const rooms = parseInt(rawUnitData.rooms) || 0;
    const isFurnished = rawUnitData.isFurnished === true;
    
    const sbrCode = generateSBRCode(compound, rooms, isFurnished, rawPrice, currency);
    
    // Check for deduplication with bounded retry
    const existingUnits = await withBoundedRetry(async () => {
      return await listRecords<{ id: string }>('listings', {
        where: [{ column: 'sbrCode', value: sbrCode }],
        select: 'id',
        limit: 1,
      });
    }, { maxRetries: 2, baseDelayMs: 150 });

    if (existingUnits.length > 0) {
      console.log(`[Unit Adder] Unit ${sbrCode} already exists. Skipping.`);
      return {
        success: true,
        status: 'duplicate',
        sbrCode,
        currency,
        timestamp,
      };
    }
    
    // Insert new unit with bounded retry.
    const unit = await withBoundedRetry(async () => {
      return await insertRecord<{ id: string }>('listings', {
        compound,
        bedrooms: rooms,
        price: rawPrice,
        priceCurrency: currency,
        sbrCode,
        status: 'available',
        syncSource: 'unit-adder',
        rawData: rawUnitData,
      });
    }, { maxRetries: 3, baseDelayMs: 200 });

    console.log(`[Unit Adder] Unit added with ID: ${unit.id} and SBR: ${sbrCode}`);

    // Dispatch exchange event (optional telemetry)
    try {
      await insertRecord('exchange', {
        type: 'agent_task',
        source: 'workflow',
        status: 'done',
        stepName: 'Unit Adder',
        progress: 100,
        payload: { sbrCode, id: unit.id },
      });
    } catch (telemetryErr) {
      console.warn('[Unit Adder] Telemetry write skipped:', (telemetryErr as Error).message);
    }
    
    return {
      success: true,
      status: 'inserted',
      id: unit.id,
      sbrCode,
      currency,
      timestamp,
    };
  } catch (error: unknown) {
    const classified = classifyError(error);

    // If duplicate race condition occurred, treat cleanly as duplicate
    if (classified.category === 'duplicate_conflict') {
      return {
        success: true,
        status: 'duplicate',
        category: classified.category,
        timestamp,
      };
    }

    console.error(`[Unit Adder] Error processing unit [${classified.category}]:`, classified.message);
    return {
      success: false,
      status: 'error',
      category: classified.category,
      error: classified.message,
      timestamp,
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

