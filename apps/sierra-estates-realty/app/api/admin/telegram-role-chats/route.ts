/**
 * GET  /api/admin/telegram-role-chats — staff dispatch-lane status for the
 * admin console: every 3-way dispatch role (CEO / Team Leader / Sales
 * Advisor) with its resolved chat id and WHERE it resolved from (env
 * override, self-registered database row, or not configured).
 *
 * POST /api/admin/telegram-role-chats — { role } sends the verification
 * message to that role's registered chat (the same sendRoleTestMessage the
 * /staffsetup flow uses) and stamps last_tested_at + verified on success.
 * Never sends to an env-only lane's id? It does — verification of the live
 * chat id is useful in both modes; the row is only stamped when a database
 * registration exists.
 *
 * Table: public.telegram_role_chats (migration 044). Staff-only via
 * verifyAdminRequest; service-role writes bypass RLS by design.
 */
import { NextRequest, NextResponse } from 'next/server';
import { updateRecord, listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
import {
  DISPATCH_ROLES,
  resolveRoleChats,
  sendRoleTestMessage,
  type RoleKey,
} from '@/lib/server/telegram-role-chats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const [resolved, rows] = await Promise.all([
    resolveRoleChats(),
    listRecords<{ role: RoleKey; chatId: string; displayName: string | null; verified: boolean; lastTestedAt: string | null; updatedAt: string }>(
      'telegram_role_chats',
      { select: 'role,chat_id,display_name,verified,last_tested_at,updated_at', limit: 10 },
    ).catch(() => []),
  ]);
  const rowByRole = new Map(rows.map((r) => [r.role, r]));

  const lanes = DISPATCH_ROLES.map((d) => {
    const r = resolved.find((x) => x.role === d.role)!;
    const row = rowByRole.get(d.role);
    return {
      role: d.role,
      label: d.label,
      email: d.email,
      chatId: r.chatId,
      source: r.source,
      displayName: row?.displayName ?? null,
      verified: row?.verified ?? false,
      lastTestedAt: row?.lastTestedAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });

  return NextResponse.json({ lanes });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  let role: string;
  try {
    const body = (await req.json()) as { role?: string };
    role = String(body.role ?? '').toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!(DISPATCH_ROLES.some((d) => d.role === role))) {
    return NextResponse.json(
      { error: `role must be one of: ${DISPATCH_ROLES.map((d) => d.role).join(', ')}` },
      { status: 400 },
    );
  }

  const resolved = (await resolveRoleChats()).find((x) => x.role === role)!;
  if (!resolved.chatId) {
    return NextResponse.json(
      { error: `Role ${role} has no chat id (neither env nor /staffsetup registration). Have the operator run /staffsetup in their bot chat.` },
      { status: 409 },
    );
  }

  const label = DISPATCH_ROLES.find((d) => d.role === role)!.label;
  const test = await sendRoleTestMessage(resolved.chatId, label);
  if (!test.ok) {
    logger.warn(`[admin/telegram-role-chats] verify send to ${role} failed: ${test.error}`);
    return NextResponse.json({ role, sent: false, error: test.error }, { status: 502 });
  }

  // Stamp the database row when one exists (database-sourced lanes).
  if (resolved.source === 'database') {
    try {
      await updateRecord('telegram_role_chats', role, { verified: true, lastTestedAt: new Date().toISOString() }, 'role');
    } catch (err) {
      logger.warn(`[admin/telegram-role-chats] could not stamp ${role}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return NextResponse.json({ role, sent: true, chatId: resolved.chatId, source: resolved.source });
}
