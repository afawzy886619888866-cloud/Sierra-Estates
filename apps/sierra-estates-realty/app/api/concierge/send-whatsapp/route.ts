import { buildPortfolioMessage } from '@/lib/services/portfolio-engine';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
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
    const leadSnap = await adminDb.collection(COLLECTIONS.stakeholders).doc(leadId).get();
    if (!leadSnap.exists) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const lead = leadSnap.data()!;
    const phone = phoneNumber || lead.phone || lead.whatsapp;

    if (!phone) {
      return NextResponse.json(
        { error: 'No phone number found for this lead' },
        { status: 400 }
      );
    }

    // Fetch the concierge portfolio
    const portfolioSnap = await adminDb.collection(COLLECTIONS.stakeholders).doc(leadId).get();
    const portfolioId = portfolioSnap.data()?.conciergePortfolioId;

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'No portfolio found for this lead. Run curation first.' },
        { status: 400 }
      );
    }

    const portfolioSnap2 = await adminDb.collection(COLLECTIONS.conciergeSelections).doc(portfolioId).get();
    if (!portfolioSnap2.exists) {
      return NextResponse.json(
        { error: 'Portfolio data not found' },
        { status: 404 }
      );
    }

    const portfolio = { id: portfolioSnap2.id, ...portfolioSnap2.data() } as any;

    // Enqueue the real WhatsApp send (drained by the dispatch worker under
    // operating-hours + per-number quota).
    const jobId = await enqueueWhatsAppJob({
      purpose: 'client-recommendation',
      toPhone: phone,
      body: buildPortfolioMessage(portfolio),
      leadId,
    });

    // Update lead record
    await adminDb.collection(COLLECTIONS.stakeholders).doc(leadId).update({
      'conciergePortfolioSentAt': Timestamp.now(),
      'conciergePortfolioSentVia': 'whatsapp',
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
