/**
 * Server-side Session Guardian bridge for Next.js API routes & Jest tests.
 * Uses `@sierra-estates/db` `insertRecord` for `outreach_dead_letter_queue`
 * while keeping the exact socket state monitoring and group-chat guard logic.
 */

import fs from 'node:fs';
import path from 'node:path';
import { insertRecord } from '@sierra-estates/db';

export const MONITORED_WHATSAPP_LINES = [
  'line-1',
  'line-2',
  'line-3',
  'line-4',
  'line-5',
  'line-6',
  'line-7',
  'line-8',
] as const;

export type MonitoredLine = (typeof MONITORED_WHATSAPP_LINES)[number] | string;

export type SocketConnectionState =
  | 'open'
  | 'connected'
  | 'READY'
  | 'connecting'
  | 'disconnected'
  | 'loggedOut'
  | 'close'
  | 'ERROR';

export interface ChatDescriptor {
  id?: string;
  isGroup?: boolean;
}

export interface SocketStateEvent {
  lineId: MonitoredLine;
  state: SocketConnectionState;
  qrCode?: string | null;
  pairingCode?: string | null;
  reason?: string | null;
  fetchImpl?: typeof fetch;
}

export interface SocketStateOutcome {
  lineId: string;
  state: SocketConnectionState;
  alertSent: boolean;
  recipientChatId: string | null;
  error?: string;
}

export interface DeadLetterPayload {
  phone: string;
  listingCode?: string | null;
  sessionName?: string | null;
  worker?: string | null;
  payload?: Record<string, unknown>;
  errorMessage: string;
  attempts?: number;
  nowMs?: number;
  stateDir?: string;
}

export interface DeadLetterResult {
  enqueued: boolean;
  storage: 'supabase' | 'local_fallback';
  attempts: number;
  nextRetryAt: string;
  error?: string;
}

const BACKOFF_HOURS = [1, 4, 24] as const;
const socketStates = new Map<string, SocketConnectionState>();

export function shouldForwardGroupListing(
  chat: ChatDescriptor | null | undefined,
): boolean {
  if (!chat || !chat.isGroup) {
    return false;
  }
  return true;
}

export function computeBackoffIso(attempts = 1, nowMs = Date.now()): string {
  const safeAttempt = Math.max(1, Math.floor(attempts));
  const idx = Math.min(safeAttempt - 1, BACKOFF_HOURS.length - 1);
  const delayMs = BACKOFF_HOURS[idx] * 60 * 60 * 1000;
  return new Date(nowMs + delayMs).toISOString();
}

export function getGuardianSnapshot(): Record<string, SocketConnectionState> {
  const snapshot: Record<string, SocketConnectionState> = {};
  for (const line of MONITORED_WHATSAPP_LINES) {
    snapshot[line] = socketStates.get(line) ?? 'connecting';
  }
  for (const [k, v] of socketStates.entries()) {
    snapshot[k] = v;
  }
  return snapshot;
}

export async function handleSocketStateChange(
  event: SocketStateEvent,
): Promise<SocketStateOutcome> {
  socketStates.set(event.lineId, event.state);

  const isDown =
    event.state === 'disconnected' ||
    event.state === 'loggedOut' ||
    event.state === 'close';

  if (!isDown) {
    return {
      lineId: event.lineId,
      state: event.state,
      alertSent: false,
      recipientChatId: null,
    };
  }

  const recipientChatId =
    (
      process.env.ROLE_MANAGEMENT_CHAT_ID ||
      process.env.TELEGRAM_CEO_CHAT_ID ||
      process.env.UNASSIGNED_DISPATCH_FALLBACK ||
      process.env.TELEGRAM_CHAT_ID ||
      ''
    ).trim() || null;

  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!recipientChatId || !botToken) {
    return {
      lineId: event.lineId,
      state: event.state,
      alertSent: false,
      recipientChatId,
      error: !botToken
        ? 'TELEGRAM_BOT_TOKEN not set'
        : 'ROLE_MANAGEMENT_CHAT_ID not set',
    };
  }

  const credentialLines: string[] = [];
  if (event.pairingCode) {
    credentialLines.push(`Pairing Code: ${event.pairingCode}`);
  }
  if (event.qrCode) {
    credentialLines.push(`QR Payload / Link: ${event.qrCode}`);
  }
  if (credentialLines.length === 0) {
    const baseUrl =
      process.env.WORKFLOW_RUNNER_URL || 'http://127.0.0.1:2786';
    credentialLines.push(
      `Re-link Portal: ${baseUrl}/pair (line=${event.lineId})`,
    );
  }

  const text = [
    `URGENT WHATSAPP SESSION ALERT`,
    `Line: ${event.lineId}`,
    `State: ${event.state}`,
    event.reason ? `Reason: ${event.reason}` : null,
    ...credentialLines,
  ]
    .filter(Boolean)
    .join('\n');

  const doFetch = event.fetchImpl ?? fetch;
  try {
    const res = await doFetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipientChatId,
          text,
        }),
      },
    );
    if (!res.ok) {
      return {
        lineId: event.lineId,
        state: event.state,
        alertSent: false,
        recipientChatId,
        error: `Telegram API HTTP ${res.status}`,
      };
    }
    return {
      lineId: event.lineId,
      state: event.state,
      alertSent: true,
      recipientChatId,
    };
  } catch (err) {
    return {
      lineId: event.lineId,
      state: event.state,
      alertSent: false,
      recipientChatId,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function enqueueOutreachDeadLetter(
  input: DeadLetterPayload,
): Promise<DeadLetterResult> {
  const attempts = Math.max(1, Number(input.attempts ?? 1));
  const nextRetryAt = computeBackoffIso(attempts, input.nowMs);
  const record = {
    phone: input.phone,
    listing_code: input.listingCode ?? null,
    session_name: input.sessionName ?? null,
    worker: input.worker ?? '13-paced-outreach',
    payload: input.payload ?? {},
    error_message: String(input.errorMessage || 'Unknown send error').slice(
      0,
      1000,
    ),
    attempts,
    max_attempts: 3,
    next_retry_at: nextRetryAt,
    status: 'pending',
    updated_at: new Date().toISOString(),
  };

  try {
    await insertRecord('outreach_dead_letter_queue', record);
    return {
      enqueued: true,
      storage: 'supabase',
      attempts,
      nextRetryAt,
    };
  } catch (err) {
    const stateDir =
      input.stateDir || path.resolve(process.cwd(), 'workflows', '.state');
    try {
      fs.mkdirSync(stateDir, { recursive: true });
      fs.appendFileSync(
        path.join(stateDir, 'outreach-dlq.jsonl'),
        JSON.stringify(record) + '\n',
      );
    } catch {
      // Best-effort local durability
    }

    return {
      enqueued: true,
      storage: 'local_fallback',
      attempts,
      nextRetryAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
