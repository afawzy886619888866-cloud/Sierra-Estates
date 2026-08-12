import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db      = admin.firestore();
const storage = admin.storage();

export class ProposalGenerator {
  async generate(
    leadId: string,
    assetId: string,
    dealId: string
  ): Promise<{ proposalUrl: string; proposalId: string }> {
    const [leadDoc, assetDoc] = await Promise.all([
      db.collection('inquiries').doc(leadId).get(),
      db.collection('listings').doc(assetId).get(),
    ]);

    if (!leadDoc.exists) throw new Error(`Lead not found: ${leadId}`);
    if (!assetDoc.exists) throw new Error(`Asset not found: ${assetId}`);

    const lead  = leadDoc.data()!;
    const asset = assetDoc.data()!;

    // Generate proposal content
    const proposalContent = this.buildProposalTemplate(lead, asset);

    // Upload to Firebase Storage
    const fileName  = `proposals/${dealId}/proposal-${Date.now()}.txt`;
    const bucket    = storage.bucket();
    const file      = bucket.file(fileName);

    await file.save(proposalContent, { contentType: 'text/plain' });
    const [proposalUrl] = await file.getSignedUrl({
      action:  'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const proposalRef = await db.collection('proposals').add({
      leadId,
      assetId,
      dealId,
      proposalUrl,
      storagePath: fileName,
      status: 'generated',
      createdAt: new Date().toISOString(),
    });

    return { proposalUrl, proposalId: proposalRef.id };
  }

  private buildProposalTemplate(
    lead: admin.firestore.DocumentData,
    asset: admin.firestore.DocumentData
  ): string {
    return `
SIERRA ESTATES
Exclusive Investment Proposal
==============================

Prepared for: ${lead.name}
Date: ${new Date().toLocaleDateString('en-EG')}

PROPERTY DETAILS
----------------
Property: ${asset.title || `${asset.bedrooms}BR in ${asset.compound}`}
Compound: ${asset.compound}
Area: ${asset.area} sqm
Bedrooms: ${asset.bedrooms}
Bathrooms: ${asset.bathrooms}
Price: ${Number(asset.price).toLocaleString()} EGP

INVESTMENT HIGHLIGHTS
----------------------
- Premium location in New Cairo
- Expected ROI: ${asset.roiEstimate || '12-15'}%
- Capital appreciation potential in ${asset.compound}

NEXT STEPS
----------
1. Review this proposal
2. Schedule a viewing at your convenience
3. Our team will guide you through the purchase process

Contact: Sierra Estates Concierge Team
`;
  }
}
