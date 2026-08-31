import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { WhatsAppParserService } from '@/lib/services/WhatsAppParserService';
import { logger } from '@/lib/logger';

// Force dynamic rendering — uses Firebase/auth at runtime
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
      const docSnap = await adminDb.collection('leads').doc(leadId).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        leadsList.push({ 
          id: docSnap.id, 
          ...data,
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
      await adminDb.collection('activities').add({
        type: 'whatsapp_outreach_queued',
        actorId: auth.uid || 'system',
        actorName: 'Intelligence OS Web Interface',
        description: `Staggered WhatsApp outreach initiated for **${leadName}**`,
        relatedId: lead.id,
        relatedType: 'lead',
        createdAt: Timestamp.now(),
      });

      // Update lead automation status
      await adminDb.collection('leads').doc(lead.id).update({
        'automation.whatsappFollowupSent': true,
        'automation.lastWhatsAppSentAt': Timestamp.now(),
        updatedAt: Timestamp.now(),
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
