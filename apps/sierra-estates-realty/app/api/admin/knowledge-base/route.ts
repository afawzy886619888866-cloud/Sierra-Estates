import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    // 1. Try to fetch from Firestore first (Production mode)
    const kbCollection = adminDb.collection('knowledge_base');
    const snapshot = await kbCollection.get();
    
    let notes: any[] = [];

    if (!snapshot.empty) {
      notes = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          tags: data.tags || [],
          lastModified: data.lastModified?.toDate ? data.lastModified.toDate() : data.lastModified,
          metadata: data.metadata || {}
        };
      });
    } else {
      // 2. Fallback to scanning the local drive vault (Local Dev mode)
      // const sync = new ObsidianVaultSync();
      // notes = await sync.scanVault();
    }
    
    // For admin UI, we don't want to send the entire content of every note over the wire,
    // just the metadata.
    const metadataList = notes.map((n: any) => ({
      id: n.id,
      title: n.title,
      tags: n.tags,
      lastModified: n.lastModified,
      metadata: n.metadata
    }));
    
    return NextResponse.json({ notes: metadataList });
  } catch (error: any) {
    logger.error('Error fetching knowledge base:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
