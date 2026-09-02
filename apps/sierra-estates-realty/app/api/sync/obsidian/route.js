import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { logger } from '@/lib/logger';
export async function POST() {
  try {
    // const sync = new ObsidianVaultSync();
    // const notes = await sync.scanVault();
    const notes = [];

    if (notes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No notes found or I: drive vault is inaccessible.' 
      }, { status: 400 });
    }

    const batch = adminDb.batch();
    const kbCollection = adminDb.collection('knowledge_base');

    for (const note of notes) {
      const docRef = kbCollection.doc(note.title.toLowerCase().replace(/\s+/g, '_'));
      batch.set(docRef, {
        title: note.title,
        content: note.content,
        tags: note.tags,
        metadata: note.metadata,
        lastModified: note.lastModified,
        updatedAt: new Date()
      }, { merge: true });
    }

    await batch.commit();

    // Log the sync completion activity
    await adminDb.collection(COLLECTIONS.activities).add({
      type: 'sync_completed',
      actorId: 'system-agent',
      actorName: 'Obsidian Agent',
      description: `Successfully synchronized **${notes.length} Obsidian Vault nodes** to neural memory.`,
      createdAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      count: notes.length,
      message: `Successfully synchronized ${notes.length} Obsidian Vault nodes to Firestore.`
    });
  } catch (error) {
    logger.error('Error in Obsidian sync API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
