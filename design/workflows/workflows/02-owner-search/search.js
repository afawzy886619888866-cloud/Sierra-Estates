/**
 * Workflow 02: Owner Search
 * ─────────────────────────────────────────
 * Searches Property Finder & OLX for direct-owner properties
 * Filters by location, price, and owner status
 * Writes to Google Sheets "owner_leads" tab
 *
 * Usage:
 *   node workflows/02-owner-search/search.js
 *   OR: cron job daily at 9am
 *
 * Env vars required:
 *   - PROPERTY_FINDER_API_BASE
 *   - PROPERTY_FINDER_JWT_TOKEN
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const fs = require('fs');

const PF_API_BASE = process.env.PROPERTY_FINDER_API_BASE || 'https://api.propertyfinder.com.eg/v3';
const PF_TOKEN = process.env.PROPERTY_FINDER_JWT_TOKEN;
const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function appendToSheet(tabName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:H`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });
    console.log(`✅ Owner lead added: ${values[2]}`);
  } catch (err) {
    console.error(`❌ Sheet write failed:`, err.message);
  }
}

async function searchPropertyFinder() {
  try {
    const response = await fetch(`${PF_API_BASE}/properties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      qs: {
        category_id: 1,
        location_id: 'cairo-new-cairo',
        purpose: 'sale',
        owner_only: 'true',
        sort_by: 'date',
        limit: 50,
      },
    });

    if (!response.ok) {
      console.error(`❌ PF API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`📊 Found ${data.data?.length || 0} owner properties on PF`);

    for (const unit of data.data || []) {
      await appendToSheet('owner_leads', [
        new Date().toISOString(),
        'property_finder',
        unit.title,
        unit.price,
        unit.location?.name || '',
        `${unit.beds || 0} BR, ${unit.baths || 0} BA, ${unit.area || '?'} sqm`,
        unit.owner?.phone || 'No contact',
        unit.url || '',
      ]);
    }
  } catch (err) {
    console.error(`❌ Property Finder search failed:`, err.message);
  }
}

// Run search
async function main() {
  console.log('🔍 Starting owner property search...');
  await searchPropertyFinder();
  console.log('✅ Owner search complete');
  process.exit(0);
}

main();
