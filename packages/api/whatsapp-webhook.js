 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express from 'express';
import pino from 'pino';
import twilio from 'twilio';
import { OpenClawAgent } from '../agents/index.js';

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
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Webhook endpoint to receive messages from WhatsApp (e.g., Twilio, Meta API)
 */
router.post('/webhook', async (req, res) => {
  // Validate Twilio signature to prevent spoofed requests
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
  const twilioSignature = req.headers['x-twilio-signature'] ;
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
    const message = _optionalChain([req, 'access', _ => _.body, 'access', _2 => _2.entry, 'optionalAccess', _3 => _3[0], 'optionalAccess', _4 => _4.changes, 'optionalAccess', _5 => _5[0], 'optionalAccess', _6 => _6.value, 'optionalAccess', _7 => _7.messages, 'optionalAccess', _8 => _8[0]]);
    const messageText = req.body.Body || req.body.message || _optionalChain([req, 'access', _9 => _9.body, 'access', _10 => _10.text, 'optionalAccess', _11 => _11.body]) || _optionalChain([message, 'optionalAccess', _12 => _12.text, 'optionalAccess', _13 => _13.body]);
    const rawSender = req.body.From || req.body.sender || _optionalChain([req, 'access', _14 => _14.body, 'access', _15 => _15.entry, 'optionalAccess', _16 => _16[0], 'optionalAccess', _17 => _17.changes, 'optionalAccess', _18 => _18[0], 'optionalAccess', _19 => _19.value, 'optionalAccess', _20 => _20.contacts, 'optionalAccess', _21 => _21[0], 'optionalAccess', _22 => _22.wa_id]);
    // Coerce sender to string to avoid passing undefined to handleWhatsAppMessage
    const sender = rawSender != null ? String(rawSender) : '';
    
    // Check if the message is from a group (Meta Cloud API specific)
    const isGroup = !!_optionalChain([message, 'optionalAccess', _23 => _23.context, 'optionalAccess', _24 => _24.group_id]);

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
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing parameters');
  }
});

export default router;
