import { Timestamp } from 'firebase/firestore';

export type DealStatus = 'draft' | 'offered' | 'signing' | 'payment_pending' | 'closed' | 'cancelled';

export interface Deal {
  id?: string;
  leadId: string;
  propertyCode: string;
  status: DealStatus;
  clientName: string;      // Denormalized for dashboard
  propertyTitle: string;   // Denormalized for dashboard
  terms: {
    offerPrice: number;
    currency: string;
    earnestMoney: number;
    closingDate: string;
    contingencies: string[];
    paymentPlan?: 'cash' | 'installments';
  };
  documents: {
    proposalUrl?: string;
    offerLetterUrl?: string;
    signedContractUrl?: string;
    closingChecklistUrl?: string;
  };
  signing: {
    envelopeId?: string;
    status?: 'none' | 'sent' | 'delivered' | 'completed' | 'declined' | 'voided';
    lastUpdate?: Timestamp;
  };
  payment: {
    stripeIntentId?: string;
    amountPaid?: number;
    status?: 'unpaid' | 'partial' | 'paid' | 'refunded';
  };
  orchestration: {
    currentStage: number; // Stage 9 lifecycle
    nextAction?: string;
    leilaPersonaInformed: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProposalMetadata {
  id: string;
  dealId: string;
  leadName: string;
  propertyName: string;
  generatedAt: Timestamp;
  expiresAt: Timestamp;
  theme: string; // "sierra-estates-quiet-luxury"
}

export interface SigningEnvelope {
  id: string;
  provider: 'docusign' | 'adobe-sign';
  recipients: {
    email: string;
    name: string;
    role: 'buyer' | 'witness' | 'notary';
    status: string;
  }[];
  files: {
    name: string;
    url: string;
  }[];
}
