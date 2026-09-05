 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express from 'express';
import { assertDbConfigured, insertRecord } from '../lib/db';

/**
 * 01-whatsapp-scraper
 *
 * Sets up an Express webhook to receive incoming WhatsApp messages (e.g. from n8n or Cloud API),
 * parses them, and saves raw leads to Firestore.
 */

export function startWhatsAppWebhookServer(port = 3000) {
  const app = express();
  app.use(express.json());

  app.post('/webhook/whatsapp', async (req, res) => {
    try {
      const payload = req.body;
      console.log('[WhatsApp Webhook] Received payload:', JSON.stringify(payload).substring(0, 100));

      // 1. Extract message content and sender
      // Note: This parsing logic depends on the specific WhatsApp API provider format
      const messageBody = _optionalChain([payload, 'optionalAccess', _ => _.entry, 'optionalAccess', _2 => _2[0], 'optionalAccess', _3 => _3.changes, 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.value, 'optionalAccess', _6 => _6.messages, 'optionalAccess', _7 => _7[0], 'optionalAccess', _8 => _8.text, 'optionalAccess', _9 => _9.body]) || _optionalChain([payload, 'optionalAccess', _10 => _10.message]) || '';
      const sender = _optionalChain([payload, 'optionalAccess', _11 => _11.entry, 'optionalAccess', _12 => _12[0], 'optionalAccess', _13 => _13.changes, 'optionalAccess', _14 => _14[0], 'optionalAccess', _15 => _15.value, 'optionalAccess', _16 => _16.messages, 'optionalAccess', _17 => _17[0], 'optionalAccess', _18 => _18.from]) || _optionalChain([payload, 'optionalAccess', _19 => _19.sender]) || '';

      if (!messageBody) {
        return res.status(200).send('No message content');
      }

      // 2. Simple regex/keyword matching for properties
      const lowerMsg = messageBody.toLowerCase();
      const isPropertyLead = lowerMsg.includes('for sale') || lowerMsg.includes('للبيع') || lowerMsg.includes('mivida');

      if (isPropertyLead && assertDbConfigured('WhatsApp Scraper')) {
        // Mapped onto the broker_listings columns: the raw text is
        // `raw_message` and the group is `source_platform`; `originalMessage`
        // and `source` were free-form Firestore fields with no column.
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


