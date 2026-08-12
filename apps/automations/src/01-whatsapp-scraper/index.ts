import express from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 01-whatsapp-scraper
 * 
 * Sets up an Express webhook to receive incoming WhatsApp messages (e.g. from n8n or Cloud API),
 * parses them, and saves raw leads to Firestore.
 */

if (!getApps().length) {
  try {
    initializeApp();
  } catch (error) {
    console.warn('[WhatsApp Scraper] Firebase admin could not be initialized.');
  }
}

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

      if (isPropertyLead) {
        const db = getFirestore();
        
        const lead = {
          sender,
          originalMessage: messageBody,
          status: 'raw',
          source: 'whatsapp_group',
          createdAt: FieldValue.serverTimestamp(),
        };

        // 3. Save to broker_listings collection
        await db.collection('broker_listings').add(lead);
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


