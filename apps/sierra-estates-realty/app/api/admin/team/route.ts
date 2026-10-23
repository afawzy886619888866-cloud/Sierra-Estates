import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import {
  listRecords,
  updateRecord,
  deleteRecord,
  upsertRecord,
  getSupabaseAdmin,
  type RecordData,
} from '@sierra-estates/db';
import { logger } from '@/lib/logger';

/**
 * Staff directory, backed by public.profiles.
 *
 * The Firestore `users` docs carried `name`; the table column is `full_name`,
 * so it is translated in both directions here and the API shape is unchanged.
 */
function rowToMember(row: RecordData): Record<string, unknown> {
  const { fullName, ...rest } = row as Record<string, unknown>;
  return { ...rest, name: fullName };
}

export async function GET(req: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await listRecords('profiles', {
      where: [{ column: 'role', op: 'in', value: ['admin', 'agent', 'broker'] }],
    });
    const team = rows.map(rowToMember);

    return NextResponse.json({ success: true, team });
  } catch (err) {
    logger.error('Error fetching team:', err);
    return NextResponse.json(
      { error: 'Failed to fetch team', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, phone, role } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // profiles.id is a foreign key onto auth.users, so a staff row cannot be
    // created on its own the way the Firestore users doc could. The auth user
    // is created first (no password — the member signs in via reset/magic
    // link), then the profile is written against that id.
    const { data: authUser, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name, phone: phone || '' },
    });
    if (authError || !authUser?.user) {
      throw new Error(authError?.message || 'Failed to create auth user');
    }

    await upsertRecord('profiles', {
      id: authUser.user.id,
      email,
      fullName: name,
      phone: phone || '',
      role: role || 'agent',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      userId: authUser.user.id,
    });
  } catch (err) {
    logger.error('Error creating team member:', err);
    return NextResponse.json(
      { error: 'Failed to create team member', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    const columns: RecordData = { ...updateData, updatedAt: new Date().toISOString() };
    if (name !== undefined) columns.fullName = name;

    await updateRecord('profiles', id, columns);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error updating team member:', err);
    return NextResponse.json(
      { error: 'Failed to update team member', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    // Removes the staff profile (and with it every role grant). The auth.users
    // row is left alone — deleting accounts is the auth layer's business.
    await deleteRecord('profiles', userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error deleting team member:', err);
    return NextResponse.json(
      { error: 'Failed to delete team member', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
