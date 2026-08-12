import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminStorage } from '@/lib/server/firebase-admin';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileName = `${Date.now()}_${file.name}`;
    const bucket = adminStorage.bucket();

    // Upload file to Firebase Storage
    const fileRef = bucket.file(`media/${fileName}`);
    await fileRef.save(Buffer.from(buffer), {
      metadata: {
        contentType: file.type,
      },
    });

    // Generate signed URL (valid for 24 hours)
    const [url] = await fileRef.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      url,
      size: file.size,
      name: file.name,
    });
  } catch (err) {
    logger.error('Error uploading media:', err);
    return NextResponse.json(
      { error: 'Failed to upload media', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
