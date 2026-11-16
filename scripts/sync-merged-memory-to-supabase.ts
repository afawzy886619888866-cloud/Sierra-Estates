/**
 * Sync Newly Merged Memory Units to Supabase PostgreSQL Database
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials missing');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  SYNCING NEWLY MERGED MEMORY UNITS INTO SUPABASE (POSTGRESQL)');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // Read unified master CSV
    const csvPath = path.join(ROOT, 'inventory_master_unified.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('❌ inventory_master_unified.csv not found');
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const header = lines[0].split(',');
    
    // Find index of columns
    const idIdx = header.findIndex(h => h.includes('RecordID'));
    const codeIdx = header.indexOf('AdditionalFeatures');
    const compIdx = header.indexOf('Location');
    const typeIdx = header.indexOf('PropertyType');
    const priceIdx = header.indexOf('PriceEGP');
    const areaIdx = header.indexOf('AreaSqm');
    const bedsIdx = header.indexOf('Bedrooms');
    const bathsIdx = header.indexOf('Bathrooms');
    const finishIdx = header.indexOf('Furnished');
    const phoneIdx = header.indexOf('ContactPhone');
    const brokerIdx = header.indexOf('OwnerBroker');
    const notesIdx = header.indexOf('Comment');

    const newUnitsToInsert = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('INV-MEM-')) continue;

        // Basic CSV split
        const parts = line.split(',');
        const refId = parts[idIdx] || '';
        if (!refId.startsWith('INV-MEM-')) continue;

        const code = parts[codeIdx] || '';
        // §21 no-fabrication: empty CSV cells become null/0 — never invented
        // 'New Cairo' / 'Apartment' / 150 sqm / 3 beds / 2 baths / 'Semi-Finished'
        // defaults. deal_type stays null: the unified CSV carries no deal column,
        // so claiming 'sale' would fabricate a property fact.
        const compound = parts[compIdx] || null;
        const pType = parts[typeIdx] || null;
        const price = parseFloat(parts[priceIdx]) || 0;
        const area = parseFloat(parts[areaIdx]) || 0;
        const beds = parseInt(parts[bedsIdx], 10) || 0;
        const baths = parseInt(parts[bathsIdx], 10) || 0;
        const finish = parts[finishIdx] || null;
        const phone = parts[phoneIdx] || '';
        const broker = parts[brokerIdx] || 'WhatsApp Ingestion';
        const notes = parts[notesIdx] || '';

        newUnitsToInsert.push({
            ref_id: refId,
            // §21: title built only from extracted facts (neutral 'Unit' when
            // the row states no type).
            title: `${[pType || 'Unit', compound ? `in ${compound}` : null].filter(Boolean).join(' ')} (${code || refId})`,
            compound: compound,
            property_type: pType,
            deal_type: null,
            price: price,
            area_sqm: area,
            bedrooms: beds,
            bathrooms: baths,
            finishing_type: finish,
            owner_phone: phone,
            broker_name: broker,
            description: notes,
            source_channel: 'whatsapp',
            status: 'active'
        });
    }

    console.log(`📦 Found ${newUnitsToInsert.length} memory-ingested units ready to sync into Supabase.`);

    if (newUnitsToInsert.length === 0) {
        console.log('No new units to insert.');
        return;
    }

    // Upsert into Supabase
    let inserted = 0;
    for (const unit of newUnitsToInsert) {
        const { error } = await supabase
            .from('listings')
            .upsert(unit, { onConflict: 'ref_id' });
        
        if (error) {
            console.warn(`⚠️ Warning on ${unit.ref_id}: ${error.message}`);
        } else {
            inserted++;
        }
    }

    console.log(`✅ Successfully synced ${inserted} / ${newUnitsToInsert.length} memory units to Supabase public.listings!`);

    // Check new total count
    const { count, error: countErr } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });

    if (!countErr) {
        console.log(`🎉 Current Supabase public.listings catalog count: ${count.toLocaleString()} properties.`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
