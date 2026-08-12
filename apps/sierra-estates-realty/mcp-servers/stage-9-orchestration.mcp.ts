// --- SIERRA DEALS MCP ---
// Purpose: Deal state management & orchestration

export const sierraDealsMcp = {
  name: 'sierra-deals',
  tools: [
    {
      name: 'create_deal',
      description: 'Initialize a new real estate deal record',
      parameters: {
        leadId: 'string',
        propertyId: 'string',
        terms: 'object'
      }
    },
    {
      name: 'update_deal_status',
      description: 'Update the state of a deal in the pipeline',
      parameters: {
        dealId: 'string',
        status: 'string'
      }
    },
    {
      name: 'get_deal_details',
      description: 'Retrieve full deal context for proposal generation',
      parameters: {
        dealId: 'string'
      }
    }
  ]
};

// --- WHATSAPP MESSAGING MCP ---
// Purpose: Lead communication via WhatsApp Business API

export const whatsappMessagingMcp = {
  name: 'whatsapp-messaging',
  tools: [
    {
      name: 'send_leila_message',
      description: 'Send a personalized message from Leila (Concierge)',
      parameters: {
        phone: 'string',
        template: 'string',
        variables: 'object'
      }
    },
    {
      name: 'send_proposal_document',
      description: 'Send a PDF proposal directly to the lead',
      parameters: {
        phone: 'string',
        pdfUrl: 'string',
        caption: 'string'
      }
    }
  ]
};

// --- DOCUSIGN SIGNING MCP ---
// Purpose: Contract signing orchestration

export const docusignSigningMcp = {
  name: 'docusign-signing',
  tools: [
    {
      name: 'initiate_signing',
      description: 'Create and send a Docusign envelope for a deal',
      parameters: {
        documentUrl: 'string',
        recipientEmail: 'string',
        recipientName: 'string'
      }
    },
    {
      name: 'get_envelope_status',
      description: 'Check the status of a signature request',
      parameters: {
        envelopeId: 'string'
      }
    }
  ]
};

// --- STRIPE PAYMENTS MCP ---
// Purpose: Process earnest money & commissions

export const stripePaymentsMcp = {
  name: 'stripe-payments',
  tools: [
    {
      name: 'create_earnest_money_intent',
      description: 'Create a Stripe payment link for earnest money deposit',
      parameters: {
        amount: 'number',
        dealId: 'string'
      }
    },
    {
      name: 'verify_payment',
      description: 'Confirm a payment intent has succeeded',
      parameters: {
        intentId: 'string'
      }
    }
  ]
};
