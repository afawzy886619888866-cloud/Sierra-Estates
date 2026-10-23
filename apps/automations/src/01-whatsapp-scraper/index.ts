import express, { type Request, type Response } from 'express';
import {
  assertDbConfigured,
  insertRecord,
  classifyError,
  withBoundedRetry,
  globalIdempotencyCache,
  IdempotencyCache,
} from '../lib/db';

/**
 * 01-whatsapp-scraper
 *
 * Sets up an Express webhook to receive incoming WhatsApp messages (e.g. from n8n or Cloud API),
 * parses them, deduplicates deliveries, and saves raw leads to the canonical Supabase broker listings table.
 */

export interface WebhookResult {
  status: 'ok' | 'no_content' | 'not_property' | 'duplicate_skipped' | 'db_unconfigured' | 'error';
  messageId?: string;
  leadCaptured?: boolean;
  category?: string;
  error?: string;
}

export async function processIncomingWhatsAppWebhook(payload: any): Promise<WebhookResult> {
  // 1. Extract message content, sender, and message ID
  const messageBody = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || payload?.message || '';
  const sender = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || payload?.sender || '';
  const rawId = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id || payload?.id || payload?.messageId;
  
  if (!messageBody) {
    return { status: 'no_content' };
  }

  // Idempotency: compute unique key for this message
  const idempotencyKey = rawId ? `wa-msg:${rawId}` : `wa-hash:${IdempotencyCache.hashPayload({ sender, messageBody })}`;

  if (globalIdempotencyCache.isDuplicate(idempotencyKey)) {
    console.log(`[WhatsApp Scraper] Duplicate message skipped: ${idempotencyKey}`);
    return { status: 'duplicate_skipped', messageId: idempotencyKey };
  }

  // 2. Simple regex/keyword matching for properties
  const lowerMsg = messageBody.toLowerCase();
  const isPropertyLead = lowerMsg.includes('for sale') || lowerMsg.includes('للبيع') || lowerMsg.includes('mivida');

  if (!isPropertyLead) {
    globalIdempotencyCache.markProcessed(idempotencyKey);
    return { status: 'not_property', messageId: idempotencyKey };
  }

  if (!assertDbConfigured('WhatsApp Scraper')) {
    return { status: 'db_unconfigured', messageId: idempotencyKey };
  }

  try {
    // 3. Write to canonical Supabase with bounded exponential backoff retries
    await withBoundedRetry(
      async (attempt) => {
        if (attempt > 0) {
          console.log(`[WhatsApp Scraper] Retrying broker_listings insert (attempt ${attempt}) for ${sender}`);
        }
        return await insertRecord('broker_listings', {
          senderInfo: sender,
          rawMessage: messageBody,
          status: 'raw',
          sourcePlatform: 'whatsapp',
          sourceGroup: 'whatsapp_group',
        });
      },
      {
        maxRetries: 3,
        baseDelayMs: 200,
        onRetry: (attempt, err, delayMs) => {
          console.warn(`[WhatsApp Scraper] Retry ${attempt} due to ${err.category} (${err.message}). Retrying in ${delayMs}ms`);
        },
      }
    );

    globalIdempotencyCache.markProcessed(idempotencyKey);
    console.log(`[WhatsApp Scraper] Lead captured from ${sender} (Key: ${idempotencyKey})`);
    return { status: 'ok', messageId: idempotencyKey, leadCaptured: true };
  } catch (error: unknown) {
    const classified = classifyError(error);
    console.error(`[WhatsApp Scraper] Persistent failure [${classified.category}]:`, classified.message);
    return {
      status: 'error',
      messageId: idempotencyKey,
      category: classified.category,
      error: classified.message,
    };
  }
}

export function startWhatsAppWebhookServer(port: number = 3000) {
  const app = express();
  app.use(express.json());

  app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      console.log('[WhatsApp Webhook] Received payload:', JSON.stringify(payload).substring(0, 100));

      const result = await processIncomingWhatsAppWebhook(payload);

      if (result.status === 'error') {
        res.status(500).json(result);
      } else {
        res.status(200).json(result);
      }
    } catch (error) {
      const classified = classifyError(error);
      console.error('[WhatsApp Webhook] Unhandled exception:', classified);
      res.status(500).json({ error: classified.message, category: classified.category });
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

