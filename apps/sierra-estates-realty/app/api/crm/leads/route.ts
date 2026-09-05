import { NextRequest, NextResponse } from 'next/server';
import { insertRecord } from '@sierra-estates/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { type StakeholderAcquisitionSource } from '@/lib/models/schema';

/**
 * AI lead-scoring & VIP routing intake. Used to write to a separate,
 * differently-cased 'Leads' collection that every other lead-touching route
 * (app/api/admin/leads, app/api/leads, app/api/inquiries,
 * app/api/webhooks/property-finder, ...) couldn't see — leads submitted here
 * were invisible on the admin Leads page. Now writes into the same
 * COLLECTIONS.stakeholders collection everything else uses, with `source`
 * set from the caller (defaulting to 'other') so the admin page can group
 * and filter by acquisition channel across all intake paths — website,
 * Property Finder, WhatsApp, and, once wired up, Instagram/Facebook/LinkedIn.
 * The sierra_ai_score/pipeline_stage/assigned_specialist fields are kept
 * as-is alongside the standard name/phone/source/notes fields rather than
 * force-fit into the full Lead/Stakeholder schema.
 *
 * Firestore → Postgres field mapping. Every field this route used to write is
 * still written; four of them land on their canonical `public.leads` column
 * because the value is identical and a second column would just be a copy:
 *
 *   name                     → full_name
 *   mobile                   → phone                (same value as `phone`)
 *   notes                    → summary_notes
 *   interaction_logs_summary → summary_notes        (same value as `notes`)
 *   target_location          → target_compound
 *   budget_ceiling           → budget_max
 *   timestamp                → created_at           (same value as `createdAt`)
 *
 * source / sierra_ai_score / pipeline_stage / assigned_specialist keep their
 * own columns — see supabase/schema.sql.
 */

const KNOWN_SOURCES: StakeholderAcquisitionSource[] = [
  'website',
  'property-finder',
  'whatsapp',
  'olx',
  'referral',
  'walk-in',
  'social-media',
  'instagram',
  'facebook',
  'linkedin',
  'other',
];

export async function POST(request: NextRequest) {
  const auth = await verifyRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { client_name, client_mobile, conversation_summary } = body;
    const extracted_metrics = body.extracted_metrics ?? {};
    const source: StakeholderAcquisitionSource = KNOWN_SOURCES.includes(body.source)
      ? body.source
      : 'other';

    if (!client_name || !client_mobile) {
      return NextResponse.json(
        { success: false, error: 'client_name and client_mobile are required' },
        { status: 400 }
      );
    }

    let leadScoreValue = 0;
    if (extracted_metrics.intent && extracted_metrics.intent !== 'UNKNOWN') leadScoreValue += 3;
    if (extracted_metrics.capital_budget > 0) leadScoreValue += 4;
    if (extracted_metrics.timeline_weeks > 0 && extracted_metrics.timeline_weeks <= 4) leadScoreValue += 3;
    else leadScoreValue += 1;

    const leadDocumentId = `SBR-LEAD-${Date.now()}`;
    const mappedCompoundFieldString = String(extracted_metrics.compound_target || '').toLowerCase().trim();
    
    let selectedSalesCloserRepId = 'GENERAL_ACTIVE_REPS_POOL';
    if (mappedCompoundFieldString.includes('uptown') || mappedCompoundFieldString.includes('mokattam')) {
      selectedSalesCloserRepId = 'CLOSER_MOKATTAM_SPECIALIST';
    } else if (mappedCompoundFieldString.includes('mivida')) {
      selectedSalesCloserRepId = 'CLOSER_VIP_GOLDEN_SQUARE';
    }

    const structuredLeadRecord = {
      id: leadDocumentId,
      fullName: client_name,
      phone: client_mobile,
      source,
      summaryNotes: conversation_summary,
      sierraAiScore: leadScoreValue,
      targetCompound: extracted_metrics.compound_target,
      budgetMax: extracted_metrics.capital_budget,
      pipelineStage: leadScoreValue >= 8 ? 'VIP_QUALIFIED_CORRIDOR' : 'LEAD_SOURCED',
      assignedSpecialist: selectedSalesCloserRepId,
      createdAt: new Date().toISOString(),
    };

    await insertRecord('leads', structuredLeadRecord);

    if (leadScoreValue >= 8 && process.env.ZAPIER_CALENDAR_WEBHOOK_URL) {
      await fetch(process.env.ZAPIER_CALENDAR_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_title: `🔥 VIP Immediate Route [Sierra AI Score: ${leadScoreValue}/10]`,
          description: `Investor Profile: ${client_name} | Assigned Specialist: ${selectedSalesCloserRepId}`,
          phone_number: client_mobile
        })
      }).catch((zapErr) => console.warn('[CRM:leads] Zapier webhook failed:', zapErr));
    }

    return NextResponse.json({ success: true, lead_id: leadDocumentId, metrics_score: `${leadScoreValue}/10`, rep_owner: selectedSalesCloserRepId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
