import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { Timestamp, Query } from 'firebase-admin/firestore';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      propertyCode,
      visitorName,
      visitorEmail,
      visitorPhone,
      preferredDate,
      preferredTime,
      numberOfPeople,
      message,
    } = body;

    // Validation
    if (!propertyCode || !visitorName || !visitorEmail || !visitorPhone || !preferredDate) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyCode, visitorName, visitorEmail, visitorPhone, preferredDate' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitorEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate date is in future
    const requestDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate < today) {
      return NextResponse.json(
        { error: 'Preferred date must be in the future' },
        { status: 400 }
      );
    }

    // Add viewing request to Firestore
    const docRef = await adminDb.collection('viewing_requests').add({
      propertyCode,
      visitorName,
      visitorEmail,
      visitorPhone,
      preferredDate,
      preferredTime: preferredTime || '',
      numberOfPeople: numberOfPeople || 1,
      message: message || '',
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json(
      {
        success: true,
        requestId: docRef.id,
        message: 'Viewing request created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Viewing request creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create viewing request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const propertyCode = searchParams.get('propertyCode');
    const status = searchParams.get('status');

    let ref: Query = adminDb.collection('viewing_requests');

    if (propertyCode) {
      ref = ref.where('propertyCode', '==', propertyCode);
    }
    if (status) {
      ref = ref.where('status', '==', status);
    }

    const snapshot = await ref.get();
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests
    }, { status: 200 });
  } catch (error) {
    logger.error('Get viewing requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewing requests' },
      { status: 500 }
    );
  }
}
