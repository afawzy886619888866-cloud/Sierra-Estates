import express from 'express';
import pino from 'pino';
import twilio from 'twilio';
import { OpenClawAgent } from '@sierra-estates/agents';

const router = express.Router();
const logger = pino({ name: 'whatsapp-webhook' });

// Initialize OpenClaw Agent
const openClaw = new OpenClawAgent({
  airtableApiKey: process.env.AIRTABLE_API_KEY || '',
  airtableBaseId: process.env.AIRTABLE_BASE_ID || '',
  airtableTableName: process.env.AIRTABLE_TABLE_NAME || 'Units',
  aiApiKey: process.env.GOOGLE_AI_API_KEY || ''
});

/**
 * Escapes special XML characters to prevent XML injection.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;'); // cspell:disable-line
}

/**
 * Webhook endpoint to receive messages from WhatsApp (e.g., Twilio, Meta API)
 */
router.post('/webhook', async (req, res) => {
  // Validate Twilio signature to prevent spoofed requests
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
  const twilioSignature = req.headers['x-twilio-signature'] as string | undefined;
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  if (twilioAuthToken) {
    if (!twilioSignature) {
      logger.warn({ msg: 'Missing Twilio signature — rejecting webhook' });
      res.sendStatus(403);
      return;
    }

    const isValid = twilio.validateRequest(twilioAuthToken, twilioSignature, url, req.body);
    if (!isValid) {
      logger.warn({ msg: 'Invalid Twilio signature — rejecting webhook' });
      res.sendStatus(403);
      return;
    }
  }

  // Log only non-sensitive metadata to avoid capturing PII
  logger.info({ msg: 'Incoming WhatsApp Webhook', hasBody: !!req.body, contentType: req.headers['content-type'] });

  try {
    // 1. Extract message details from payload. 
    // Format depends on your provider (Twilio vs Meta Cloud API)
    // Assuming a generic format for this example:
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const messageText = req.body.Body || req.body.message || req.body.text?.body || message?.text?.body;
    const rawSender = req.body.From || req.body.sender || req.body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id;
    // Coerce sender to string to avoid passing undefined to handleWhatsAppMessage
    const sender = rawSender != null ? String(rawSender) : '';
    
    // Check if the message is from a group (Meta Cloud API specific)
    const isGroup = !!message?.context?.group_id;

    if (!messageText) {
      logger.warn('No text found in incoming message payload');
      res.status(200).send('No text found'); // always return 200 to WhatsApp
      return;
    }

    // 2. Pass to OpenClaw Agent
    const reply = await openClaw.handleWhatsAppMessage(messageText, sender, isGroup);

    // 3. Send reply back to WhatsApp (Using Twilio TwiML as an example)
    // If using Meta API, you would make a POST request to their Messages API here.
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`
      <Response>
        <Message>${escapeXml(reply)}</Message>
      </Response>
    `);
  } catch (error) {
    logger.error({ err: error, msg: 'Error processing webhook' });
    res.status(500).send('Internal Server Error');
  }
});

// GET endpoint for Meta API webhook verification
router.get('/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('Webhook verified successfully');
      const safeChallenge = typeof challenge === 'string' ? challenge.replace(/[^\w-]/g, '') : '';
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(safeChallenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing parameters');
  }
});

export default router;
