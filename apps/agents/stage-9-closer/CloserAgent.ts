/**
 * Stage 9 Closer Agent
 * Handles the final stages of a deal: viewing follow-up, proposal finalization,
 * signing initiation, and deal completion.
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export class CloserAgent {
  private static instance: CloserAgent;

  static getInstance(): CloserAgent {
    if (!CloserAgent.instance) {
      CloserAgent.instance = new CloserAgent();
    }
    return CloserAgent.instance;
  }

  async handleViewingRequest(viewingId: string): Promise<void> {
    const doc = await db.collection('viewingRequests').doc(viewingId).get();
    if (!doc.exists) throw new Error(`Viewing not found: ${viewingId}`);

    await db.collection('viewingRequests').doc(viewingId).update({
      stage: 'S9_viewing_initiated',
      updatedAt: new Date().toISOString(),
    });
  }

  async finalizeProposal(dealId: string, proposalData: Record<string, unknown>): Promise<string> {
    const proposalRef = await db.collection('proposals').add({
      dealId,
      ...proposalData,
      status: 'finalized',
      stage: 'S9_proposal_finalized',
      createdAt: new Date().toISOString(),
    });

    await db.collection('deals').doc(dealId).update({
      proposalId: proposalRef.id,
      stage: 'S9_proposal_ready',
      updatedAt: new Date().toISOString(),
    });

    return proposalRef.id;
  }

  async initiateSigning(dealId: string): Promise<{ envelopeId: string }> {
    const envelopeId = `ENV-${dealId}-${Date.now()}`;

    await db.collection('deals').doc(dealId).update({
      signingEnvelope: {
        envelopeId,
        status: 'created',
        createdAt: new Date().toISOString(),
      },
      stage: 'S9_signing_initiated',
      updatedAt: new Date().toISOString(),
    });

    return { envelopeId };
  }

  async completeClosing(dealId: string): Promise<void> {
    const doc = await db.collection('deals').doc(dealId).get();
    if (!doc.exists) throw new Error(`Deal not found: ${dealId}`);

    const data = doc.data()!;

    // Create sale record
    await db.collection('sales').add({
      dealId,
      assetId: data.assetId,
      leadId: data.stakeholderId,
      salePriceEGP: data.negotiatedPrice || 0,
      commissionRate: data.commissionRate || 2.5,
      commissionEGP: data.commissionEGP || 0,
      closeDate: new Date().toISOString(),
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    });

    await db.collection('deals').doc(dealId).update({
      stage: 'S10_complete',
      status: 'closed_won',
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
