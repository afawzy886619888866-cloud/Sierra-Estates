import { NextResponse } from 'next/server';
import { insertRecord, upsertRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
export async function POST() {
  try {
    // const sync = new ObsidianVaultSync();
    // const notes = await sync.scanVault();
    const notes: any[] = [];

    if (notes.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No notes found or I: drive vault is inaccessible.'
      }, { status: 400 });
    }

    // Was a single Firestore batch commit. Postgres upserts are applied one row
    // at a time here, so a mid-loop failure leaves earlier notes written — the
    // write is idempotent (keyed on the slugified title) so a re-run converges.
    for (const note of notes) {
      await upsertRecord('knowledge_base', {
        id: note.title.toLowerCase().replace(/\s+/g, '_'),
        title: note.title,
        content: note.content,
        tags: note.tags,
        metadata: note.metadata,
        lastModified: note.lastModified,
        updatedAt: new Date().toISOString(),
      });
    }

    // Log the sync completion activity
    await insertRecord('activities', {
      type: 'sync_completed',
      actorId: 'system-agent',
      actorName: 'Obsidian Agent',
      description: `Successfully synchronized **${notes.length} Obsidian Vault nodes** to neural memory.`,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      count: notes.length,
      message: `Successfully synchronized ${notes.length} Obsidian Vault nodes to Firestore.`
    });
  } catch (error: any) {
    logger.error('Error in Obsidian sync API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
