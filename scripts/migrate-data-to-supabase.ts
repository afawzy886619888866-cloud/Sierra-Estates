/**
 * Sierra Estates — Supabase Data Migration & Seed Script
 *
 * Reads listings, leads, and master inventory from Excel / JSON sources
 * and batch-inserts them into your Supabase PostgreSQL database.
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('placeholder')) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

interface ParsedListing {
    ref_id: string;
    title: string;
    compound: string;
    deal_type: 'sale' | 'rent';
    property_type: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area_sqm: number;
    finishing_type: string;
    delivery_year?: number;
    down_payment?: number;
    monthly_installment?: number;
    installment_years?: number;
    owner_phone?: string;
    owner_name?: string;
    broker_name?: string;
    broker_phone?: string;
    source_channel: string;
    status: 'active' | 'pending' | 'sold' | 'rented';
}

async function migrateData() {
    console.log('🚀 Starting Sierra Estates -> Supabase End-to-End Migration...');
    console.log(`📡 Connecting to Supabase at: ${SUPABASE_URL}`);

    // 1. Health check
    const { error: pingError } = await supabase.from('listings').select('id').limit(1);
    if (pingError) {
        console.error('❌ Connection or table missing. Did you run supabase/schema.sql in the Supabase SQL Editor?', pingError.message);
        return;
    }
    console.log('✅ Supabase database connection verified.');

    // 2. Find real live inventory files
    const possiblePaths = [
        path.resolve(__dirname, '../apps/sierra-estates-realty/data/real-listings.json'),
        path.resolve(__dirname, '../Final_RealEstate_Database.xlsx'),
        path.resolve(__dirname, '../data/Final_RealEstate_Database.xlsx'),
        path.resolve(__dirname, '../apps/sierra-estates-realty/public/data/inventory.json'),
        path.resolve(__dirname, '../packages/db/data/seed.json'),
    ];

    const existingFile = possiblePaths.find(p => fs.existsSync(p));
    const listingsToInsert: ParsedListing[] = [];

    if (existingFile && existingFile.endsWith('.json')) {
        console.log(`📖 Reading Real Ingested JSON file: ${existingFile}`);
        const raw = JSON.parse(fs.readFileSync(existingFile, 'utf8'));
        const list = Array.isArray(raw) ? raw : (raw.properties || raw.listings || []);
        console.log(`📊 Found ${list.length} real property records.`);

        list.forEach((item: any, idx: number) => {
            const compound = item.compound || item.cmp || 'New Cairo';
            const price = Number(item.price) || 0;
            const dealType = (item.mode || item.deal_type || 'sale').toLowerCase().includes('rent') ? 'rent' : 'sale';

            listingsToInsert.push({
                ref_id: item.code || `SE-${(idx + 1).toString().padStart(4, '0')}`,
                title: `${item.type || 'Property'} in ${compound}`,
                compound,
                deal_type: dealType,
                property_type: item.type || 'Apartment',
                price: price,
                bedrooms: parseInt(item.beds || '3', 10) || 3,
                bathrooms: parseInt(item.baths || '2', 10) || 2,
                area_sqm: parseFloat(item.area || '150') || 150,
                finishing_type: item.finishing || 'Core & Shell',
                owner_phone: item.mobile || '',
                owner_name: item.ownerName || '',
                source_channel: item.ago?.includes('WhatsApp') ? 'whatsapp' : 'google_sheets',
                status: 'active',
            });
        });
    } else if (existingFile && existingFile.endsWith('.xlsx')) {
        console.log(`📖 Reading Excel file: ${existingFile}`);
        const workbook = XLSX.readFile(existingFile);
        const sheetName = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📊 Found ${rows.length} rows in Excel sheet.`);

        rows.forEach((row, index) => {
            const compound = String(row['Compound'] || row['الكمبوند'] || row['compound'] || 'New Cairo').trim();
            const priceNum = parseFloat(String(row['Price'] || row['السعر'] || row['price'] || '0').replace(/[^0-9.]/g, '')) || 0;
            const areaNum = parseFloat(String(row['Area'] || row['المساحة'] || row['area'] || '0').replace(/[^0-9.]/g, '')) || 0;
            const bedsNum = parseInt(String(row['Bedrooms'] || row['غرف'] || row['beds'] || '0'), 10) || 0;
            const type = String(row['Type'] || row['النوع'] || row['type'] || 'Apartment').trim();
            const dealType = String(row['DealType'] || row['نوع العرض'] || 'sale').toLowerCase().includes('rent') ? 'rent' : 'sale';

            listingsToInsert.push({
                ref_id: `SE-${(index + 1).toString().padStart(4, '0')}`,
                title: `${type} in ${compound}`,
                compound,
                deal_type: dealType,
                property_type: type,
                price: priceNum,
                bedrooms: bedsNum,
                bathrooms: parseInt(String(row['Bathrooms'] || row['حمامات'] || '1'), 10) || 1,
                area_sqm: areaNum || 150,
                finishing_type: String(row['Finishing'] || row['التشطيب'] || 'Core & Shell'),
                owner_phone: String(row['Phone'] || row['تليفون'] || row['phone'] || ''),
                owner_name: String(row['Owner'] || row['المالك'] || ''),
                source_channel: 'excel',
                status: 'active',
            });
        });
    } else {
        // Generate seed properties for New Cairo
        console.log('ℹ️ No Excel file found. Creating standard Sierra Estates New Cairo inventory...');
        const compounds = ['Mivida', 'Villette Sodic', 'Palm Hills New Cairo', 'Mountain View iCity', 'Hyde Park', 'Zed East', 'Eastown', 'Swan Lake'];
        const types = ['Apartment', 'Villa', 'Townhouse', 'Duplex', 'Penthouse'];

        for (let i = 1; i <= 30; i++) {
            const cmp = compounds[i % compounds.length];
            const typ = types[i % types.length];
            const price = 4500000 + (i * 750000);
            listingsToInsert.push({
                ref_id: `SE-${i.toString().padStart(4, '0')}`,
                title: `Luxury ${typ} in ${cmp}`,
                compound: cmp,
                deal_type: i % 4 === 0 ? 'rent' : 'sale',
                property_type: typ,
                price: i % 4 === 0 ? 35000 + (i * 2000) : price,
                bedrooms: 2 + (i % 4),
                bathrooms: 2 + (i % 3),
                area_sqm: 120 + (i * 15),
                finishing_type: i % 2 === 0 ? 'Ultra Super Lux' : 'Core & Shell',
                delivery_year: 2026,
                down_payment: price * 0.1,
                installment_years: 7,
                monthly_installment: (price * 0.9) / (7 * 12),
                source_channel: 'direct',
                status: 'active',
            });
        }
    }

    // Batch insert listings
    console.log(`💾 Inserting ${listingsToInsert.length} properties into Supabase...`);
    const { data: inserted, error: insertError } = await supabase
        .from('listings')
        .upsert(listingsToInsert, { onConflict: 'ref_id' })
        .select('id, ref_id, title');

    if (insertError) {
        console.error('❌ Insert error:', insertError.message);
    } else {
        console.log(`🎉 Successfully synced ${inserted?.length || listingsToInsert.length} properties to Supabase!`);
    }

    // Insert sample CRM Leads
    const sampleLeads = [
        {
            full_name: 'Dr. Tarek Mansour',
            phone: '+201012345678',
            channel: 'whatsapp',
            lead_type: 'buyer',
            status: 'qualified',
            target_compound: 'Mivida',
            target_property_type: 'Apartment',
            budget_min: 7000000,
            budget_max: 12000000,
            lead_score: 85,
        },
        {
            full_name: 'Eng. Karim El-Shazly',
            phone: '+201123456789',
            channel: 'web',
            lead_type: 'investor',
            status: 'new',
            target_compound: 'Palm Hills New Cairo',
            target_property_type: 'Villa',
            budget_min: 15000000,
            budget_max: 25000000,
            lead_score: 92,
        },
    ];

    console.log('👤 Seeding CRM Leads...');
    await supabase.from('leads').upsert(sampleLeads, { onConflict: 'phone' });
    console.log('✅ CRM Leads synchronized.');

    console.log('\n======================================================');
    console.log('🏁 End-to-End Supabase Migration Complete!');
    console.log('======================================================\n');
}

migrateData().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
});
