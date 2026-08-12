import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usersSnap = await adminDb.collection('users').where('role', 'in', ['admin', 'agent', 'broker']).get();
    const team = usersSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
    }));

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

    // Create user in Firestore
    const userRef = await adminDb.collection('users').add({
      name,
      email,
      phone: phone || '',
      role: role || 'agent',
      status: 'active',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      userId: userRef.id,
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
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    await adminDb.collection('users').doc(id).update({
      ...updateData,
      updatedAt: new Date(),
    });

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

    await adminDb.collection('users').doc(userId).delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error deleting team member:', err);
    return NextResponse.json(
      { error: 'Failed to delete team member', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
