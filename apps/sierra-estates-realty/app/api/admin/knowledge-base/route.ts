import { NextRequest, NextResponse } from 'next/server';
import { listRecords } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    // last_modified is a timestamptz, so the record layer hands it back as an
    // ISO string — no Firestore Timestamp .toDate() shim needed.
    const notes = await listRecords<{
      id: string;
      title: string;
      content: string;
      tags?: string[];
      lastModified?: string;
      metadata?: Record<string, unknown>;
    }>('knowledge_base');

    
    // For admin UI, we don't want to send the entire content of every note over the wire,
    // just the metadata.
    const metadataList = notes.map((n) => ({
      id: n.id,
      title: n.title,
      tags: n.tags ?? [],
      lastModified: n.lastModified,
      metadata: n.metadata ?? {}
    }));
    
    return NextResponse.json({ notes: metadataList });
  } catch (error: any) {
    logger.error('Error fetching knowledge base:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
