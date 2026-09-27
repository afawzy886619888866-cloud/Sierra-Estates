import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_FILE = path.join(
  ROOT,
  'apps',
  'sierra-estates-realty',
  'data',
  'sierra-estates-inventory.xlsx',
);
const WORKBOOK_SHEET = 'All Listings';
const REQUIRED_COLUMNS = ['Compound', 'Property Type', 'Deal Type', 'Price (EGP)', 'Area (sqm)'];

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'pull';
  const options = { command, file: DEFAULT_FILE, dryRun: false };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--file') options.file = path.resolve(ROOT, args[++index]);
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--sheet') options.sheet = args[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['pull', 'push'].includes(options.command)) {
    throw new Error('Usage: sync-inventory-excel-supabase.mjs <pull|push> [--file path] [--dry-run]');
  }
  return options;
}

function requireSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function value(row, ...names) {
  for (const name of names) {
    const result = row[name];
    if (result !== undefined && result !== null && String(result).trim() !== '') return result;
  }
  return '';
}

function numberValue(input) {
  const cleaned = String(input ?? '').replace(/,/g, '').replace(/[^\d.-]/g, '');
  const result = Number(cleaned);
  return Number.isFinite(result) ? result : 0;
}

function stableReference(row) {
  const explicit = String(value(row, 'Reference Code', 'reference_code', 'Code', 'code', 'Unit Code', 'UnitCode', 'Record ID', 'RecordID')).trim();
  if (explicit && explicit.length > 2 && !['NADA', 'NULL', 'UNDEFINED'].includes(explicit.toUpperCase())) {
    return explicit.toUpperCase();
  }
  const fingerprint = [
    value(row, 'Compound', 'compound', 'Compound / Project', 'compound / project'),
    value(row, 'Property Type', 'property_type', 'PropertyType', 'Unit Type'),
    value(row, 'Deal Type', 'deal_type', 'DealType', 'Operation (Deal Type)'),
    value(row, 'Area (sqm)', 'area_sqm', 'Area', 'space_m2'),
    value(row, 'Price (EGP)', 'price', 'Price', 'price_egp'),
    value(row, 'Owner Phone', 'owner_phone', 'Phone', 'Contact Phone', 'mobile'),
  ].map((item) => String(item).trim().toLowerCase()).join('|');
  return `XLS-${createHash('sha256').update(fingerprint).digest('hex').slice(0, 16).toUpperCase()}`;
}

function toWorkbookRow(listing) {
  return {
    'Reference Code': listing.reference_code || listing.code || listing.unit_code || listing.id,
    Compound: listing.compound || '',
    'Zone / Area': listing.location_area || listing.city || '',
    'Property Type': listing.property_type || '',
    'Deal Type': listing.deal_type || '',
    'Price (EGP)': listing.price ?? 0,
    Currency: listing.price_currency || 'EGP',
    'Area (sqm)': listing.area_sqm ?? 0,
    Bedrooms: listing.bedrooms ?? 0,
    Bathrooms: listing.bathrooms ?? 0,
    Furnishing: listing.finishing_type || listing.furnishing_status || '',
    Status: listing.status || '',
    Verified: Boolean(listing.verified_at),
    'Publish to Client': Boolean(listing.published_at),
    'Owner / Contact Name': listing.owner_name || listing.broker_name || '',
    'Owner Phone': listing.owner_phone || listing.broker_phone || '',
    'Source Channel': listing.source_channel || listing.sync_source || '',
    'Property Finder Ref': listing.pf_reference_number || '',
    'Last Updated': listing.updated_at || listing.created_at || '',
    Notes: listing.description || '',
    'Supabase ID': listing.id,
  };
}

function writeWorkbook(rows, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const workbook = XLSX.utils.book_new();
  const all = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, all, WORKBOOK_SHEET);

  const available = rows.filter((row) => ['active', 'available'].includes(String(row.Status).toLowerCase()));
  const rentals = rows.filter((row) => String(row['Deal Type']).toLowerCase() === 'rent');
  const sales = rows.filter((row) => ['sale', 'resale', 'primary'].includes(String(row['Deal Type']).toLowerCase()));
  const review = rows.filter((row) => !row.Verified || !row['Publish to Client']);

  for (const [name, data] of [
    ['Available', available],
    ['Rentals', rentals],
    ['Sales', sales],
    ['Needs Review', review],
  ]) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), name);
  }

  const readme = [
    ['Workbook', 'Sierra Estates inventory sync'],
    ['Source', 'Supabase public.listings'],
    ['Write-back', 'Use pnpm inventory:excel:push -- --file <path> --dry-run'],
    ['Warning', 'Do not add service-role keys to this workbook or commit them to git.'],
    ['Generated', new Date().toISOString()],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(readme), 'README');
  XLSX.writeFile(workbook, file);
}

async function pull(options) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('listings')
    .select('id, reference_code, code, unit_code, compound, location_area, city, property_type, deal_type, price, price_currency, area_sqm, bedrooms, bathrooms, finishing_type, furnishing_status, status, verified_at, published_at, owner_name, owner_phone, broker_name, broker_phone, source_channel, sync_source, pf_reference_number, description, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Supabase listings pull failed: ${error.message}`);
  writeWorkbook((data || []).map(toWorkbookRow), options.file);
  console.log(`Wrote ${(data || []).length} listings to ${options.file}`);
}

function readRows(file, sheetName) {
  if (!fs.existsSync(file)) throw new Error(`Workbook not found: ${file}`);
  const workbook = XLSX.readFile(file, { cellDates: true });
  const sheet = sheetName
    || (workbook.SheetNames.includes(WORKBOOK_SHEET) ? WORKBOOK_SHEET
      : workbook.SheetNames.includes('All_Units') ? 'All_Units'
        : workbook.SheetNames.includes('All Listings') ? 'All Listings'
          : workbook.SheetNames[0]);
  if (!workbook.Sheets[sheet]) throw new Error(`Worksheet not found: ${sheet}`);
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' });
}

function toListing(row) {
  const compound = String(value(row, 'Compound', 'compound', 'Compound / Project', 'compound / project', 'Project')).trim();
  const propertyType = String(value(row, 'Property Type', 'property_type', 'PropertyType', 'propertytype', 'Unit Type', 'unit_type', 'Type')).trim();
  let dealType = String(value(row, 'Deal Type', 'deal_type', 'DealType', 'dealtype', 'Operation (Deal Type)', 'Operation', 'deal')).trim().toLowerCase();
  if (dealType.includes('rent') || dealType.includes('ايجار') || dealType.includes('إيجار')) dealType = 'rent';
  else if (dealType.includes('resale') || dealType.includes('re-sale')) dealType = 'resale';
  else if (dealType.includes('sale') || dealType.includes('بيع') || dealType.includes('primary')) dealType = 'sale';

  const price = numberValue(value(row, 'Price (EGP)', 'price', 'price_egp', 'Price', 'total price', 'Price Display'));
  const area = numberValue(value(row, 'Area (sqm)', 'area_sqm', 'Area', 'space_m2', 'space'));
  if (!compound || !propertyType || !['sale', 'rent', 'resale', 'primary'].includes(dealType) || price < 0 || area < 0) {
    return { error: 'Compound, Property Type, valid Deal Type, Price (EGP), and Area (sqm) are required.', row };
  }

  const isVerified = String(value(row, 'Verified', 'verified', 'Listing Status')).toLowerCase().includes('verified');
  const isPublish = ['true', 'yes', 'published', 'active', 'available'].includes(String(value(row, 'Publish to Client', 'publish_to_client', 'Status', 'status', 'Availability')).toLowerCase());

  return {
    reference_code: stableReference(row),
    code: String(value(row, 'Code', 'code', 'Reference Code', 'reference_code', 'Unit Code', 'UnitCode')).trim() || null,
    unit_code: String(value(row, 'Unit Code', 'UnitCode', 'unit_code')).trim() || null,
    compound,
    location_area: String(value(row, 'Zone / Area', 'zone', 'location_area', 'Location', 'Zone / District')).trim() || 'New Cairo',
    city: 'Cairo',
    property_type: propertyType,
    deal_type: dealType,
    price,
    price_currency: String(value(row, 'Currency', 'price_currency')).trim() || 'EGP',
    area_sqm: area,
    bedrooms: Math.max(0, Math.trunc(numberValue(value(row, 'Bedrooms', 'bedrooms', 'rooms', 'beds')))),
    bathrooms: Math.max(0, Math.trunc(numberValue(value(row, 'Bathrooms', 'bathrooms', 'baths')))),
    finishing_type: String(value(row, 'Furnishing', 'Furnishing Status', 'Finishing', 'finishing_type', 'finishing')).trim() || null,
    status: String(value(row, 'Status', 'status', 'availability', 'Listing Status', 'Availability')).trim() || 'available',
    verified_at: isVerified ? new Date().toISOString() : null,
    published_at: isPublish ? new Date().toISOString() : null,
    owner_name: String(value(row, 'Owner / Contact Name', 'Contact Name', 'ContactName', 'owner_name', 'name')).trim() || null,
    owner_phone: String(value(row, 'Owner Phone', 'Contact Phone', 'Phone', 'owner_phone', 'mobile')).trim() || null,
    source_channel: String(value(row, 'Source Channel', 'source_channel', 'SourceFile')).trim() || 'excel_import',
    pf_reference_number: String(value(row, 'Property Finder Ref', 'pf_reference_number')).trim() || null,
    description: String(value(row, 'Notes', 'Description / Notes', 'description', 'notes', 'Listing Description / Notes')).trim() || null,
    sync_source: 'excel_import',
    updated_at: new Date().toISOString(),
  };
}

async function push(options) {
  const rows = readRows(options.file, options.sheet);
  const converted = rows.map(toListing);
  const invalid = converted.filter((item) => item.error);
  if (invalid.length) {
    throw new Error(`${invalid.length} invalid row(s). First error: ${invalid[0].error}`);
  }
  const listings = converted.map((item) => item);
  if (options.dryRun) {
    console.log(`Dry run: ${listings.length} valid listing(s) would be upserted.`);
    return;
  }
  const supabase = requireSupabase();
  const BATCH_SIZE = 250;
  let totalUpserted = 0;
  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const chunk = listings.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('listings').upsert(chunk, { onConflict: 'reference_code' });
    if (error) throw new Error(`Supabase listings push failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    totalUpserted += chunk.length;
    console.log(`Upserted ${totalUpserted}/${listings.length} listings...`);
  }
  console.log(`Successfully upserted ${totalUpserted} listing(s) into Supabase.`);
}

async function main() {
  loadEnv();
  const options = parseArgs();
  await (options.command === 'pull' ? pull(options) : push(options));
}

main().catch((error) => {
  console.error(`Inventory Excel sync failed: ${error.message}`);
  process.exitCode = 1;
});
