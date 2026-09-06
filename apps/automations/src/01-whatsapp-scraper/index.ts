import express from 'express';
import { assertDbConfigured, insertRecord } from '../lib/db';

/**
 * 01-whatsapp-scraper
 *
 * Sets up an Express webhook to receive incoming WhatsApp messages (e.g. from n8n or Cloud API),
 * parses them, and saves raw leads to the canonical Supabase broker listings table.
 */

export function startWhatsAppWebhookServer(port: number = 3000) {
  const app = express();
  app.use(express.json());

  app.post('/webhook/whatsapp', async (req, res) => {
    try {
      const payload = req.body;
      console.log('[WhatsApp Webhook] Received payload:', JSON.stringify(payload).substring(0, 100));

      // 1. Extract message content and sender
      // Note: This parsing logic depends on the specific WhatsApp API provider format
      const messageBody = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || payload?.message || '';
      const sender = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || payload?.sender || '';

      if (!messageBody) {
        return res.status(200).send('No message content');
      }

      // 2. Simple regex/keyword matching for properties
      const lowerMsg = messageBody.toLowerCase();
      const isPropertyLead = lowerMsg.includes('for sale') || lowerMsg.includes('للبيع') || lowerMsg.includes('mivida');

      if (isPropertyLead && assertDbConfigured('WhatsApp Scraper')) {
        // Mapped onto the broker_listings columns: the raw text is
        // `raw_message` and the group is `source_platform`; the remaining
        // provider payload is kept in the typed database columns.
        await insertRecord('broker_listings', {
          senderInfo: sender,
          rawMessage: messageBody,
          status: 'raw',
          sourcePlatform: 'whatsapp',
          sourceGroup: 'whatsapp_group',
        });
        console.log(`[WhatsApp Scraper] Lead captured from ${sender}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('[WhatsApp Webhook] Error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  app.listen(port, () => {
    console.log(`[WhatsApp Scraper] Webhook server listening on port ${port}`);
  });
}

// Allow direct execution
if (require.main === module) {
  startWhatsAppWebhookServer(process.env.PORT ? parseInt(process.env.PORT) : 3000);
}

