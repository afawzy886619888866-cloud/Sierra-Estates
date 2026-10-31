/**
 * POST /api/admin/leads/[id]/recommendations — the dispatch action of the
 * Leads & AI Matchmaker hub (/admin/leads).
 *
 * Flow: ensure the lead has semantic matches (runs /api/matching's engine
 * when the profile is empty), compose the luxury recommendation message from
 * the top matches, queue it through the production WhatsApp dispatch queue
 * (public.whatsapp_queue → /api/cron/whatsapp-dispatch) and stamp the lead's
 * curation metadata. Every step is real: no matches → 422 with the reason,
 * no phone → 422, queue failure → 502 with the provider error.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRecord, updateRecord, insertRecord } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { runMatchingForLead } from '@/lib/services/matching-engine';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MatchResult {
  unitId: string;
  matchScore: number;
  matchReason: string;
}

function recommendationMessage(
  name: string,
  matches: { title: string; compound: string | null; price: string; score: number }[],
): string {
  const first = name.split(' ')[0] || 'there';
  const lines = [
    `${first}, a curated selection from Sierra Estates 🏛️`,
    '',
    'Our AI Matchmaker aligned these residences with your brief:',
    '',
    ...matches.map(
      (m, i) =>
        `${i + 1}. ${m.title}${m.compound ? ` · ${m.compound}` : ''}\n   ${m.price} — match ${Math.round(m.score)}%`,
    ),
    '',
    'Reply here to arrange a private viewing.',
    '— Sierra Estates Concierge',
  ];
  return lines.join('\n');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;

  try {
    const lead = await getRecord<Record<string, unknown>>('leads', id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }
    const phone = String(lead.phone ?? '').trim();
    if (!phone) {
      return NextResponse.json(
        { error: 'Lead has no phone number — WhatsApp dispatch is not possible.' },
        { status: 422 },
      );
    }

    // Fresh matches when the profile is empty or stale (> 24h old).
    const profiling = (lead.aiProfiling ?? {}) as Record<string, unknown>;
    let matches = (profiling.topMatches as MatchResult[] | undefined) ?? [];
    const lastRun = typeof profiling.lastMatchRunAt === 'string' ? Date.parse(profiling.lastMatchRunAt) : 0;
    if (matches.length === 0 || Date.now() - lastRun > 24 * 3_600_000) {
      try {
        matches = await runMatchingForLead(id);
      } catch (err) {
        return NextResponse.json(
          {
            error:
              'The AI matchmaker could not run for this lead — check the AI provider configuration on the bot desk.',
            detail: err instanceof Error ? err.message : String(err),
          },
          { status: 502 },
        );
      }
    }

    if (matches.length === 0) {
      return NextResponse.json(
        {
          error:
            'No property matches for this lead yet — broaden the brief (budget, compound, type) and re-run the matchmaker.',
        },
        { status: 422 },
      );
    }

    // Hydrate the top matches with display fields.
    const top = matches.slice(0, 3);
    const hydrated: { title: string; compound: string | null; price: string; score: number }[] = [];
    for (const match of top) {
      const listing = await getRecord<Record<string, unknown>>('listings', String(match.unitId)).catch(
        () => null,
      );
      const priceNum =
        typeof listing?.price === 'number'
          ? (listing.price as number)
          : parseFloat(String(listing?.price ?? '0')) || 0;
      hydrated.push({
        title: String(listing?.title ?? listing?.compound ?? 'Curated residence'),
        compound: (listing?.compound as string | null) ?? null,
        price: priceNum >= 1_000_000 ? `${(priceNum / 1_000_000).toFixed(1)}M EGP` : `${priceNum.toLocaleString('en-US')} EGP`,
        score: Number(match.matchScore) || 0,
      });
    }

    const name = String(lead.fullName ?? lead.name ?? 'Client');
    const messageId = await enqueueWhatsAppJob({
      purpose: 'client-recommendation',
      toPhone: phone,
      toName: name,
      body: recommendationMessage(name, hydrated),
      leadId: id,
      metadata: {
        flow: 'command-center-recommendations',
        matchIds: top.map((m) => m.unitId),
        scores: top.map((m) => m.matchScore),
      },
    });

    const now = new Date().toISOString();
    await updateRecord('leads', id, {
      lastCuratedAt: now,
      conciergePortfolioSentAt: now,
      conciergePortfolioSentVia: 'whatsapp',
      automation: {
        ...((lead.automation ?? {}) as Record<string, unknown>),
        lastRecommendationDispatch: now,
        lastRecommendationChannel: 'whatsapp',
        lastRecommendationMatches: top.map((m) => m.unitId),
      },
    }).catch(() => undefined);

    try {
      await insertRecord('activities', {
        type: 'lead_recommendations_dispatched',
        actorId: auth.uid ?? 'system',
        actorName: auth.email ?? 'Command Center',
        description: `Recommendation portfolio dispatched to ${name} (${top.length} matches, WhatsApp queue ${messageId.slice(0, 8)})`,
        relatedId: id,
        relatedType: 'lead',
        text: `Recommendations sent · ${name} · ${top.length} matches`,
        color: 'var(--gold-luxury)',
      });
    } catch {
      // Activity feed is best-effort.
    }

    return NextResponse.json({
      success: true,
      queuedMessageId: messageId,
      dispatched: top.length,
      matches: hydrated,
    });
  } catch (error) {
    logger.error('[LEAD_RECOMMENDATIONS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to dispatch recommendations.' },
      { status: 500 },
    );
  }
}
