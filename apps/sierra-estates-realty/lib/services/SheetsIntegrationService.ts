import Papa from 'papaparse';
import { adminDb } from '../server/firebase-admin';
import { COLLECTIONS, Unit } from '../models/schema';
import { normalizePropertyType, normalizeStatus } from './listing-normalize';

export class SheetsIntegrationService {
  /**
   * Fetches the CSV from the Google Sheets "Published to Web" URL,
   * parses it, and syncs to Firestore.
   */
  static async syncPublishedCSV(csvUrl: string) {
    console.log(`[SheetsIntegrationService] Fetching CSV from: ${csvUrl}`);
    
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      
      // Parse CSV using PapaParse
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Automatically converts numbers
      });

      if (parsed.errors.length > 0) {
        console.warn('[SheetsIntegrationService] CSV parsing warnings:', parsed.errors);
      }

      const rows = parsed.data as Record<string, any>[];
      console.log(`[SheetsIntegrationService] Parsed ${rows.length} rows.`);

      let syncedCount = 0;
      let errorCount = 0;

      const batch = adminDb.batch();
      const unitsCollection = adminDb.collection(COLLECTIONS.units);

      for (const row of rows) {
        try {
          const unitData = this.mapRowToUnit(row);
          if (!unitData) {
            console.log(`[SheetsIntegrationService] Skipping invalid row:`, row);
            continue;
          }

          // Check if it already exists based on reference number
          let docRef;
          if (unitData.referenceNumber) {
            const existingQuery = await unitsCollection.where('referenceNumber', '==', unitData.referenceNumber).limit(1).get();
            if (!existingQuery.empty) {
              docRef = existingQuery.docs[0].ref;
            } else {
              docRef = unitsCollection.doc();
            }
          } else {
            docRef = unitsCollection.doc();
          }

          batch.set(docRef, unitData, { merge: true });
          syncedCount++;
        } catch (err) {
          console.error('[SheetsIntegrationService] Error mapping row:', err);
          errorCount++;
        }
      }

      await batch.commit();
      
      console.log(`[SheetsIntegrationService] Sync complete. Synced: ${syncedCount}, Errors: ${errorCount}`);
      
      return {
        success: true,
        syncedCount,
        errorCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`[SheetsIntegrationService] Sync failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Maps a raw CSV row object to our Firestore Unit schema.
   * Customize the header keys as needed based on the actual Google Sheet.
   */
  private static mapRowToUnit(row: Record<string, any>): Partial<Unit> | null {
    // Determine required fields
    const title = row['Title'] || row['title'] || row['Property Title'];
    const price = row['Price'] || row['price'];
    
    if (!title || price === undefined) {
      return null; // Skip if missing crucial data
    }

    const typeStr = row['Type'] || row['Property Type'] || 'apartment';
    const statusStr = row['Status'] || row['status'] || 'available';

    // Shared normalizer keeps commercial / co-working / office types from being
    // mislabelled as apartments and is consistent with the Airtable path.
    const { propertyType, category } = normalizePropertyType(typeStr);

    const unit: Partial<Unit> = {
      title: String(title),
      referenceNumber: row['Reference Number'] || row['reference'] || `SBR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      propertyType,
      category,
      status: normalizeStatus(statusStr),
      price: Number(price) || 0,
      area: Number(row['Area'] || row['area'] || row['Size'] || 0),
      bedrooms: Number(row['Bedrooms'] || row['beds']) || undefined,
      bathrooms: Number(row['Bathrooms'] || row['baths']) || undefined,
      compound: row['Compound'] || row['Project'] || undefined,
      location: row['Location'] || row['Area'] || undefined, // fallback mapping
      description: row['Description'] || row['description'] || '',
      featuredImage: row['Featured Image'] || row['Image URL'] || undefined,
      syncSource: 'sheets',
      lastSyncAt: new Date().toISOString(),
    };

    return unit;
  }
}
