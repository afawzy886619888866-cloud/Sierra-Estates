import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { getRecord, insertRecord, updateRecord } from '@sierra-estates/db';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { logger } from '@/lib/logger';

// Force dynamic rendering — reads the caller's identity at runtime
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Bulk owner outreach requires a real admin identity. verifyAdminRequest
  // resolves the Firestore role itself and rejects identity-less callers, so a
  // holder of the shared SBR_SECRET_KEY (cron/webhook credential) can no longer
  // trigger mass WhatsApp sends.
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse('Authorized personnel only');

  try {
    const { leadIds, customMessage } = await request.json();
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }

    // Fetch details of all requested leads
    const leadsList: any[] = [];
    for (const leadId of leadIds) {
      const lead = await getRecord<Record<string, unknown>>('leads', leadId);
      if (lead) {
        leadsList.push({ 
          ...lead,
          customMessage: customMessage || '' 
        });
      }
    }

    if (leadsList.length === 0) {
      return NextResponse.json({ error: 'No valid leads found matching IDs' }, { status: 404 });
    }

    // Trigger bulk outreach
    const result = await WhatsAppParserService.dispatchBulkOwnerOutreach(leadsList);

    // Record activity and update lead statuses
    for (const lead of leadsList) {
      const leadName = lead.name || 'Valued Lead';
      
      // Add Activity log
      const now = new Date().toISOString();

      await insertRecord('activities', {
        type: 'whatsapp_outreach_queued',
        actorId: auth.uid || 'system',
        actorName: 'Intelligence OS Web Interface',
        description: `Staggered WhatsApp outreach initiated for **${leadName}**`,
        relatedId: lead.id,
        relatedType: 'lead',
        createdAt: now,
      });

      // Update lead automation status. Firestore could set nested keys with
      // dotted paths; `automation` is a JSONB column here, so the existing
      // object is merged rather than replaced — otherwise unrelated flags on
      // it would be wiped.
      await updateRecord('leads', lead.id, {
        automation: {
          ...(lead.automation as Record<string, unknown> | undefined),
          whatsappFollowupSent: true,
          lastWhatsAppSentAt: now,
        },
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    logger.error('[WHATSAPP_BULK_SEND]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
