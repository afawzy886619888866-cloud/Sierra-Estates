import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../lib/firebase';

/**
 * 05-unit-adder
 *
 * Cleans and deduplicates new units into Firestore.
 */

function generateSBRCode(compound: string, rooms: number, isFurnished: boolean, price: number, currency: string) {
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

export async function runUnitAdder(rawUnitData: any) {
  console.log(`[Unit Adder] Processing new unit payload for ${rawUnitData.compound}`);
  
  try {
    const db = getDb('Unit Adder');
    
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
    const existingUnitQuery = await db.collection('listings')
      .where('sbrCode', '==', sbrCode)
      .limit(1)
      .get();
      
    if (!existingUnitQuery.empty) {
      console.log(`[Unit Adder] Unit ${sbrCode} already exists. Skipping.`);
      return {
        success: true,
        status: 'duplicate',
        sbrCode,
        currency,
        timestamp: new Date().toISOString()
      };
    }
    
    // Insert new unit
    const newUnit = {
      ...rawUnitData,
      price: rawPrice,
      currency,
      sbrCode,
      status: 'available',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const docRef = await db.collection('listings').add(newUnit);
    console.log(`[Unit Adder] Unit added with ID: ${docRef.id} and SBR: ${sbrCode}`);
    
    // Dispatch exchange event (optional telemetry)
    await db.collection('exchange').add({
      type: 'agent_task',
      status: 'done',
      stepName: 'Unit Adder',
      progress: 100,
      createdAt: FieldValue.serverTimestamp(),
      payload: { sbrCode, id: docRef.id },
    });
    
    return {
      success: true,
      status: 'inserted',
      id: docRef.id,
      sbrCode,
      currency,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
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


