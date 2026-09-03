import { buildPortfolioMessage } from '@/lib/services/portfolio-engine';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { getRecord, updateRecord } from '@sierra-estates/db';
import { COLLECTIONS } from '@/lib/models/schema';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

interface SendPortfolioRequest {
  leadId: string;
  phoneNumber?: string;
}

export const POST = async (req: NextRequest) => {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body: SendPortfolioRequest = await req.json();
    const { leadId, phoneNumber } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Fetch lead to get phone number if not provided
    const lead = await getRecord<{
      phone?: string;
      whatsapp?: string;
      conciergePortfolioId?: string;
    }>(COLLECTIONS.stakeholders, leadId);
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const phone = phoneNumber || lead.phone || lead.whatsapp;

    if (!phone) {
      return NextResponse.json(
        { error: 'No phone number found for this lead' },
        { status: 400 }
      );
    }

    // Fetch the concierge portfolio
    const portfolioId = lead.conciergePortfolioId;

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'No portfolio found for this lead. Run curation first.' },
        { status: 400 }
      );
    }

    const portfolio = await getRecord<any>(COLLECTIONS.conciergeSelections, portfolioId);
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio data not found' },
        { status: 404 }
      );
    }

    // Enqueue the real WhatsApp send (drained by the dispatch worker under
    // operating-hours + per-number quota).
    const jobId = await enqueueWhatsAppJob({
      purpose: 'client-recommendation',
      toPhone: phone,
      body: buildPortfolioMessage(portfolio),
      leadId,
    });

    // Update lead record
    await updateRecord(COLLECTIONS.stakeholders, leadId, {
      conciergePortfolioSentAt: new Date().toISOString(),
      conciergePortfolioSentVia: 'whatsapp',
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: `Portfolio queued for ${phone}`,
    });
  } catch (error) {
    logger.error('Error sending portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to send portfolio' },
      { status: 500 }
    );
  }
};
