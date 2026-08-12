export interface Deal {
  id: string;
  leadId: string;
  propertyId: string;
  status: 'Draft' | 'ProposalSent' | 'Negotiating' | 'Signing' | 'PaymentPending' | 'Closed' | 'Cancelled';
  terms: {
    offerPrice: number;
    currency: string;
    earnestMoney: number;
    closingDate: string;
    contingencies: string[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    assignedAgent: string;
  };
  documents: {
    proposalUrl?: string;
    signedAgreementUrl?: string;
    receiptUrl?: string;
  };
  signing?: {
    envelopeId: string;
    status: string;
    lastChecked: string;
  };
  payment?: {
    intentId: string;
    status: 'pending' | 'succeeded' | 'failed';
    amount: number;
  };
}

export interface ProposalMetadata {
  id: string;
  dealId: string;
  version: number;
  templateId: string;
  generatedAt: string;
  expiryAt: string;
}

export interface SigningEnvelope {
  envelopeId: string;
  dealId: string;
  recipients: Array<{
    name: string;
    email: string;
    role: 'Buyer' | 'Seller' | 'Agent';
    status: 'Sent' | 'Delivered' | 'Completed' | 'Declined';
  }>;
  status: 'Sent' | 'Delivered' | 'Completed' | 'Declined' | 'Voided';
}
