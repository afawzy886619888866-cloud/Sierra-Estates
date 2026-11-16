# Telegram Intake — Operations Instructions

**Updated:** 2026-10-11 (Phase 6 rework, master-execution run)

## What changed

`POST /api/telegram/webhook` is now an authenticated, idempotent, durable intake channel:

1. **Authentication** — `X-Telegram-Bot-Api-Secret-Token` must match `TELEGRAM_WEBHOOK_SECRET` (register the webhook with `setWebhook` + `secret_token`). Production fails closed (503) when the secret is unset.
2. **Idempotency** — every `update_id` is ledgered in `telegram_processed_updates` (migration `20261011_027`). Telegram retries and webhook replays are skipped instead of re-executing commands or creating duplicate intakes. The sibling route `/api/webhooks/telegram` (the Command OS with `/approve`) uses the same ledger — mutating commands can no longer re-run on retry.
3. **Photo/media intake** — photos are downloaded through the real Telegram `getFile` API and routed through the same canonical `OwnerListingIntakeService` as WhatsApp owner messages. Albums (media groups) arrive as separate messages sharing a `media_group_id`; each photo lands on the same intake record.
4. **Text intake** — listing-shaped text (compound/price/area/type…) opens a durable intake; missing fields are requested with the persistent intake code, and replies MERGE into the same record.
5. **Honesty** — all mock/demo data was removed. Without database credentials the bot states that plainly; it never shows fabricated leads, listings or stats.

## Channel model

- **Internal operations/review channel** = the bot chat (`TELEGRAM_CHAT_ID`): intake notifications, staff alerts, commands.
- **Public marketing channel**: publishing to a public channel happens ONLY after the 8-condition publish gate passes (same gate as Property Finder). There is no configured public channel today; default is internal-only. Do not publish unverified units to any public channel.

## Unit pipeline (Telegram source)

1. Owner sends unit text and/or photos (+ caption).
2. Intake persisted with source `telegram`; stable intake code `SE-TG-…`.
3. Photos downloaded and stored in Supabase Storage (`listing-photos` bucket), linked to the intake.
4. Canonical inventory record created in `REVIEW_REQUIRED` — private until staff verification.
5. Internal notice contains the code, description, photos and the admin record link; staff are notified the unit awaits review.
6. After the publish gate passes, the approved content may go to the authorized public channel (if configured) and through the Property Finder feed — with the actual remote outcome reported and the same canonical unit updated.

The database remains the source of truth. Telegram messages refer to canonical persisted records and are safe to replay without creating duplicates.

## Bot commands

| Command | Behavior |
|---|---|
| `/start` | chat id + command help |
| `/diag` | honest diagnostics (DB ready, token, ledger, intake path) |
| `/stats` | real counts (no demo numbers) |
| `/leads` | latest 5 real leads |
| `/listings` | latest 5 real listings |
| `/ag [order]` | Antigravity agent command |

## Environment variables (names only)

- `TELEGRAM_BOT_TOKEN` — bot token (auth for API calls).
- `TELEGRAM_WEBHOOK_SECRET` — webhook shared secret (fail-closed in production).
- `TELEGRAM_CHAT_ID` — the internal operations chat.
