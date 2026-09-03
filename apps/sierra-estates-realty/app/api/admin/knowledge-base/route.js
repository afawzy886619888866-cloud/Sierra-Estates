 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { NextResponse } from 'next/server';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
export async function GET(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    // last_modified is a timestamptz, so the record layer hands it back as an
    // ISO string — no Firestore Timestamp .toDate() shim needed.
    const notes = await listRecords






('knowledge_base');

    
    // For admin UI, we don't want to send the entire content of every note over the wire,
    // just the metadata.
    const metadataList = notes.map((n) => ({
      id: n.id,
      title: n.title,
      tags: _nullishCoalesce(n.tags, () => ( [])),
      lastModified: n.lastModified,
      metadata: _nullishCoalesce(n.metadata, () => ( {}))
    }));
    
    return NextResponse.json({ notes: metadataList });
  } catch (error) {
    logger.error('Error fetching knowledge base:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
