 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { getSupabaseAdmin } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

/**
 * Supabase Storage bucket that replaces the Firebase Storage bucket. It must
 * exist and be private — the route hands out short-lived signed URLs rather
 * than public links.
 */
const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'media';

export async function POST(req) {
  // Verify admin authentication
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') ;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileName = `${Date.now()}_${file.name}`;
    const objectPath = `media/${fileName}`;
    const storage = getSupabaseAdmin().storage.from(MEDIA_BUCKET);

    // supabase-js returns { error } rather than throwing, so an ignored error
    // here would report a successful upload that never happened.
    const { error: uploadError } = await storage.upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      throw new Error(`Upload to ${MEDIA_BUCKET} failed: ${uploadError.message}`);
    }

    // Signed URL, valid for 24 hours — same window as the Firebase version.
    const { data: signed, error: signError } = await storage.createSignedUrl(
      objectPath,
      24 * 60 * 60
    );
    if (signError || !_optionalChain([signed, 'optionalAccess', _ => _.signedUrl])) {
      throw new Error(`Could not sign ${objectPath}: ${_nullishCoalesce(_optionalChain([signError, 'optionalAccess', _2 => _2.message]), () => ( 'no URL returned'))}`);
    }
    const url = signed.signedUrl;

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
