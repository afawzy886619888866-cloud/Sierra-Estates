/**
 * POST /api/ingest/whatsapp-group-chat
 *
 * Accepts a WhatsApp group chat export (.txt) as multipart/form-data
 * and runs the full scraping pipeline:
 *
 *  1. Parse raw text → messages
 *  2. Gemini NLP → property listings
 *  3. Deduplicate by phone+compound+price
 *  4. Upsert to Supabase `units`
 *  5. Sync to Airtable (if configured)
 *  6. Return structured report with missing-field warnings
 *
 * FORM FIELDS:
 *   file      — the WhatsApp .txt export file (required)
 *   groupName — name of the WhatsApp group (optional, for tagging)
 *   skipDup   — "true"|"false" — skip deduplication (default: true)
 *   airtable  — "true"|"false" — push to Airtable (default: true)
 *
 * AUTHENTICATION: Admin API key required (x-admin-key header or admin session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { scrapeWhatsAppGroupChat } from '@/lib/services/WhatsAppGroupChatScraper';
import { logger } from '@/lib/logger';

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  // Auth gate
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded. Use field name "file".' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();

    if (fileContent.length < 100) {
      return NextResponse.json({ error: 'File appears to be empty or too small.' }, { status: 400 });
    }

    const groupName = (formData.get('groupName') as string) || file.name.replace(/\.txt$/i, '') || 'Unknown Group';
    const skipDuplicates = formData.get('skipDup') !== 'false';
    const syncToAirtable = formData.get('airtable') !== 'false';

    logger.info(`[Ingest] WhatsApp chat from group "${groupName}" — ${fileContent.length} chars, skipDup=${skipDuplicates}`);

    const report = await scrapeWhatsAppGroupChat(fileContent, {
      groupName,
      skipDuplicates,
      syncToAirtable,
    });

    // Build human-readable missing info summary
    const missingInfoWarnings: string[] = [];
    if (report.missingInfoCount > 0) {
      missingInfoWarnings.push(`⚠️ ${report.missingInfoCount} listings have incomplete data:`);
      for (const [field, count] of Object.entries(report.missingInfoSummary)) {
        missingInfoWarnings.push(`   • "${field}" missing in ${count} listings`);
      }
      missingInfoWarnings.push('');
      missingInfoWarnings.push('Tip: Re-scrape or ask the sender for the missing info before pushing to market.');
    }

    return NextResponse.json({
      success: true,
      report: {
        totalMessages: report.totalMessages,
        listingsFound: report.listingsFound,
        duplicatesSkipped: report.duplicatesSkipped,
        syncedToSupabase: report.syncedToSupabase,
        syncedToAirtable: report.syncedToAirtable,
        failedRows: report.failedRows,
        missingInfoCount: report.missingInfoCount,
        missingInfoSummary: report.missingInfoSummary,
        missingInfoWarnings,
        timestamp: report.timestamp,
      },
      listings: report.listings.slice(0, 50), // Return first 50 for preview
    });

  } catch (error: any) {
    logger.error('[Ingest/WhatsApp] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'WhatsApp Group Chat Ingestion API',
    usage: {
      method: 'POST',
      contentType: 'multipart/form-data',
      fields: {
        file: 'WhatsApp .txt export (required)',
        groupName: 'Group name for tagging (optional)',
        skipDup: '"true" to skip duplicates (default: true)',
        airtable: '"true" to sync to Airtable (default: true)',
      },
      authentication: 'x-admin-key header or admin session cookie',
    },
    howToExport: {
      step1: 'Open WhatsApp group on your phone',
      step2: 'Tap ⋮ (3 dots) → More → Export chat',
      step3: 'Choose "Without Media"',
      step4: 'Share the .txt file to your PC (email / Google Drive / USB)',
      step5: 'Upload using this endpoint or via Admin Portal → OpenClaw → Import Chat',
    },
    airtableFields: [
      'Compound', 'Price EGP', 'Deal Type', 'Area sqm', 'Bedrooms',
      'Unit Type', 'Finishing', 'Owner Phone', 'Sender', 'Has Photo',
      'Valuation Score', 'Urgency Score', 'Sierra Code', 'Missing Fields',
      'Raw Text', 'Timestamp', 'Notes', 'Source', 'Status',
    ],
  });
}
