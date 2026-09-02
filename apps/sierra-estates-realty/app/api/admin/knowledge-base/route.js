 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { logger } from '@/lib/logger';
export async function GET(req) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    // 1. Try to fetch from Firestore first (Production mode)
    const kbCollection = adminDb.collection('knowledge_base');
    const snapshot = await kbCollection.get();
    
    let notes = [];

    if (!snapshot.empty) {
      notes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          tags: data.tags || [],
          lastModified: _optionalChain([data, 'access', _ => _.lastModified, 'optionalAccess', _2 => _2.toDate]) ? data.lastModified.toDate() : data.lastModified,
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
    const metadataList = notes.map((n) => ({
      id: n.id,
      title: n.title,
      tags: n.tags,
      lastModified: n.lastModified,
      metadata: n.metadata
    }));
    
    return NextResponse.json({ notes: metadataList });
  } catch (error) {
    logger.error('Error fetching knowledge base:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
