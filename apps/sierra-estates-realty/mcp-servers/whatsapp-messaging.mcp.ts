/**
 * WHATSAPP MESSAGING MCP SERVER
 * Handles lead communication via WhatsApp Business API.
 */

export const mcp_whatsapp_messaging = {
  name: 'whatsapp-messaging',
  tools: [
    {
      name: 'send_message',
      description: 'Send a template-based WhatsApp message to a lead.',
      parameters: {
        type: 'object',
        properties: {
          leadPhone: { type: 'string' },
          template: { type: 'string' },
          variables: { type: 'object' }
        },
        required: ['leadPhone', 'template']
      }
    },
    {
      name: 'send_document',
      description: 'Send a PDF proposal or contract link via WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          leadPhone: { type: 'string' },
          documentUrl: { type: 'string' }
        },
        required: ['leadPhone', 'documentUrl']
      }
    }
  ]
};
