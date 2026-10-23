import { NextRequest, NextResponse } from 'next/server';
import { countRecords, getSupabaseAdmin, insertRecord, listRecords } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { verifySharedSecret } from '@/lib/server/webhook-auth';

/**
 * TELEGRAM WEBHOOK (Phase 6 rework)
 *
 * 1. AUTHENTICATED: X-Telegram-Bot-Api-Secret-Token shared secret, fail-closed
 *    in production when unset.
 * 2. IDEMPOTENT: every update_id is ledgered in telegram_processed_updates;
 *    Telegram retries and webhook replays are skipped instead of re-executing
 *    commands and intakes.
 * 3. DURABLE MEDIA INTAKE: photos (incl. media groups with captions) are
 *    downloaded via the real getFile API and flow through the SAME canonical
 *    OwnerListingIntakeService as WhatsApp owner messages — the database stays
 *    the single source of truth.
 * 4. HONEST: no mock/demo data. Without database credentials the bot says so.
 */

export async function POST(req: NextRequest) {
  // Telegram sends X-Telegram-Bot-Api-Secret-Token when the webhook was registered
  // with a secret_token (setWebhook). Register the webhook with a secret and set
  // TELEGRAM_WEBHOOK_SECRET — in production an unset secret fails closed (503).
  const denied = verifySharedSecret(req, {
    header: 'x-telegram-bot-api-secret-token',
    secret: process.env.TELEGRAM_WEBHOOK_SECRET,
    name: 'TELEGRAM_WEBHOOK_SECRET',
  });
  if (denied) return denied;

  try {
    const body = await req.json();
    const { message } = body;

    // ── PHASE 6: update_id idempotency ledger ──
    // Telegram redelivers updates on non-200/timeouts and operators replay
    // webhooks; without the ledger every retry re-executed the command.
    const updateId: number | null =
      typeof body.update_id === 'number' ? body.update_id : null;
    if (updateId != null) {
      try {
        await insertRecord('telegram_processed_updates', {
          updateId,
          kind: message?.text ? 'command' : message?.photo ? 'photo' : 'other',
        });
      } catch (err: any) {
        if (/duplicate key|unique constraint/i.test(String(err?.message ?? err))) {
          return NextResponse.json({ ok: true, deduplicated: true });
        }
        // Ledger failure: log and continue — command-level side effects below
        // are individually guarded by the DB writes they perform.
        logger.warn(`[telegram] update ledger write failed: ${err?.message}`);
      }
    }

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = (message.text ?? message.caption ?? '').toLowerCase();

    const token = process.env.TELEGRAM_BOT_TOKEN;

    const sendMessage = async (msg: string) => {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: 'HTML'
          }),
        });
      } catch (err) {
        logger.error("Failed to send Telegram message:", err);
      }
    };

    // ── PHASE 6: real photo/media intake (albums + captions) ──
    // A photo message (with or without caption) is downloaded via getFile and
    // routed through the canonical intake service: durable intake record,
    // merging, REVIEW_REQUIRED staging, Supabase Storage. No mock, no skip.
    if (Array.isArray(message.photo) && message.photo.length > 0) {
      const caption = message.caption ?? '';
      const media = await downloadTelegramPhotos(message.photo, token);
      try {
        const { OwnerListingIntakeService } = await import('@/lib/services/OwnerListingIntakeService');
        const outcome = await OwnerListingIntakeService.processOwnerMessage({
          source: 'telegram',
          sender: String(message.from?.id ?? chatId),
          groupId: `telegram:${chatId}`,
          messageId: updateId != null ? `tg-${updateId}` : undefined,
          text: caption || '[photo]',
          media: media.length > 0 ? media : undefined,
        });
        const code = outcome.intakeCode ?? '(pending)';
        switch (outcome.action) {
          case 'duplicate_event':
          case 'duplicate_listing':
            break; // silent — replays and duplicates create nothing new
          case 'not_a_listing':
            await sendMessage(`📷 Photo received. Attach it to a unit listing message (compound, price, area, type) so it can be linked to an intake record.`);
            break;
          case 'needs_information':
          case 'needs_code':
            await sendMessage(`📥 Photo stored against intake <code>${code}</code>. Still missing: ${(outcome.missingFields ?? []).join(', ')}. Send the remaining details as a reply — they merge into the same record.`);
            break;
          case 'unit_recorded':
          case 'merged':
            await sendMessage(`✅ Unit recorded from Telegram (intake <code>${code}</code>) — <b>REVIEW_REQUIRED</b>, private until staff verification. Property Finder: not created until the publish gate passes.`);
            break;
          default:
            await sendMessage(`⚠️ Intake recorded with an error — staff review required (intake <code>${code}</code>).`);
        }
      } catch (err: any) {
        logger.warn(`[telegram] photo intake failed: ${err?.message}`);
        await sendMessage(`⚠️ Photo intake error: ${err?.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (!message.text) return NextResponse.json({ ok: true });

    // Mock mode = no usable database credentials. getSupabaseAdmin() throws
    // when the service-role key is missing (it never falls back to the anon
    // key). PHASE 6: mock mode now answers HONESTLY — the fabricated
    // demo data (Marassi penthouses, Burj Khalifa villas, invented leads)
    // is gone.
    let isMockMode = false;
    try {
      getSupabaseAdmin();
    } catch {
      isMockMode = true;
    }

    if (text === '/start') {
      await sendMessage(`
<b>Welcome to the Sierra Estates Bot</b>

Your Chat ID is: <code>${chatId}</code>
Please add this to your <code>.env.local</code> as <code>TELEGRAM_CHAT_ID</code> to enable operational notifications.

Commands:
/stats - View executive performance
/leads - View latest 5 leads
/listings - View market inventory
/diag - System diagnostics
Send a unit listing text or photos with a caption to open an owner intake.
      `);
    } else if (text === '/diag') {
      await sendMessage(`
<b>🛠 SYSTEM DIAGNOSTICS</b>
<b>Database Ready:</b> ${isMockMode ? '❌' : '✅'}
<b>Bot Token:</b> ${token ? '✅' : '❌'}
<b>Update Idempotency Ledger:</b> telegram_processed_updates
<b>Intake Path:</b> OwnerListingIntakeService (durable, REVIEW_REQUIRED staging)
<b>Timestamp:</b> ${new Date().toISOString()}
      `);
    } else if (text === '/stats') {
      if (isMockMode) {
        await sendMessage('📊 Database is not initialized — no stats are available. Configure Supabase credentials; no demo numbers are shown.');
        return NextResponse.json({ ok: true });
      }
      try {
        // Same shape as before: inventory is counted over at most 100 rows,
        // leads over the whole table.
        const inventory = await listRecords('listings', { select: 'id', limit: 100 });
        const activeCount = inventory.length;

        const leadCount = await countRecords('leads');

        await sendMessage(`
<b>📊 Sierra Estates - Portfolio Stats</b>
<b>Inventory (first 100 rows):</b> ${activeCount} units
<b>Total Leads:</b> ${leadCount} profiles
<b>Operational Status:</b> ${leadCount > 0 || activeCount > 0 ? 'LIVE' : 'NO DATA'}
        `);
      } catch (err: any) {
        await sendMessage(`❌ <b>Database Error:</b> ${err.message}`);
      }
    } else if (text === '/leads') {
      if (isMockMode) {
        await sendMessage('👤 Database is not initialized — no leads are available. No demo leads are shown.');
        return NextResponse.json({ ok: true });
      }
      try {
        const leads = await listRecords<Record<string, any>>('leads', {
          orderBy: { column: 'createdAt', ascending: false },
          limit: 5,
        });

        if (leads.length === 0) {
          await sendMessage("<b>PIPELINE STATUS</b>\n\nNo recent leads found.");
          return NextResponse.json({ ok: true });
        }

        let leadText = "<b>Latest 5 Leads:</b>\n\n";
        for (const d of leads) {
            // createdAt is an ISO string in Postgres, a Timestamp in Firestore.
            const created = d.createdAt ? new Date(d.createdAt) : null;
            const dateStr = created && !Number.isNaN(created.getTime())
              ? created.toLocaleDateString()
              : 'N/A';
            leadText += `👤 ${d.fullName || d.name || 'Unknown'} (${d.phone || 'No Phone'})\n📅 ${dateStr}\n---\n`;
        }
        await sendMessage(leadText);
      } catch (err: any) {
        await sendMessage(`❌ <b>Database Error:</b> ${err.message}`);
      }
    } else if (text === '/listings') {
      if (isMockMode) {
        await sendMessage('🏢 Database is not initialized — no listings are available. No demo listings are shown.');
        return NextResponse.json({ ok: true });
      }
      try {
        const listings = await listRecords<Record<string, any>>('listings', {
          orderBy: { column: 'createdAt', ascending: false },
          limit: 5,
        });

        if (listings.length === 0) {
          await sendMessage("<b>INVENTORY STATUS</b>\n\nNo listings found.");
          return NextResponse.json({ ok: true });
        }

        let listingText = "<b>Latest 5 Listings:</b>\n\n";
        for (const d of listings) {
            listingText += `🏢 ${d.title || 'Untitled'} - EGP ${d.price || 0}\n📍 ${d.locationArea || d.location || 'Unknown'}\n---\n`;
        }
        await sendMessage(listingText);
      } catch (err: any) {
        await sendMessage(`❌ <b>Database Error:</b> ${err.message}`);
      }
    } else if (text.startsWith('/ag') || text.includes('antigravity')) {
        const queryText = text.replace('/ag', '').trim();

        await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
        });

        const { processAgentCommand } = await import('@/lib/services/antigravity-agent');
        const response = await processAgentCommand(chatId, queryText || "Hello! I am Antigravity. How can I assist your operations today?");
        await sendMessage(response.message);
    } else if (text.length > 40) {
      // Non-command text of listing shape → the same durable intake path.
      try {
        const { OwnerListingIntakeService } = await import('@/lib/services/OwnerListingIntakeService');
        const outcome = await OwnerListingIntakeService.processOwnerMessage({
          source: 'telegram',
          sender: String(message.from?.id ?? chatId),
          groupId: `telegram:${chatId}`,
          messageId: updateId != null ? `tg-${updateId}` : undefined,
          text: message.text,
        });
        if (outcome.action === 'needs_information' || outcome.action === 'needs_code') {
          await sendMessage(`📥 Intake <code>${outcome.intakeCode}</code> opened — reply with: ${(outcome.missingFields ?? []).join(', ')}. Replies merge into the same record.`);
        } else if (outcome.action === 'unit_recorded') {
          await sendMessage(`✅ Unit recorded (intake <code>${outcome.intakeCode}</code>) — <b>REVIEW_REQUIRED</b>, private until staff verification.`);
        }
        // not_a_listing / duplicate_* → silent (conversational or replayed)
      } catch (err: any) {
        logger.warn(`[telegram] text intake failed: ${err?.message}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true, error: error.message }); // Always return 200 to Telegram
  }
}

/** Download real Telegram photos (largest size per photo) via getFile. */
async function downloadTelegramPhotos(
  photo: Array<{ file_id: string; file_unique_id?: string; width?: number; height?: number }>,
  token: string | undefined,
): Promise<{ data: string; mimeType: string }[]> {
  if (!token) return [];
  const out: { data: string; mimeType: string }[] = [];
  // Telegram sends photo as size variants of ONE photo; media groups arrive
  // as separate messages sharing a media_group_id. Take the largest variant.
  const largest = photo.reduce((a, b) => ((b.width ?? 0) >= (a.width ?? 0) ? b : a), photo[0]);
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largest.file_id}`, {
      signal: AbortSignal.timeout(15_000),
    });
    const file = (await fileRes.json().catch(() => ({}))) as { ok?: boolean; result?: { file_path?: string } };
    const filePath = file.result?.file_path;
    if (!file.ok || !filePath) {
      logger.warn(`[telegram] getFile failed for ${largest.file_id}`);
      return out;
    }
    const dataRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!dataRes.ok) {
      logger.warn(`[telegram] photo download failed (${dataRes.status})`);
      return out;
    }
    const buf = Buffer.from(await dataRes.arrayBuffer());
    out.push({ data: buf.toString('base64'), mimeType: dataRes.headers.get('content-type') || 'image/jpeg' });
  } catch (err: any) {
    logger.warn(`[telegram] photo download error: ${err?.message}`);
  }
  return out;
}
