import { Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function backupDatabase(databaseId: string, outputFilename: string) {
  console.log(`\n🚀 Starting backup for database: ${databaseId}...`);
  try {
    const db = new Firestore({
      projectId: 'sierra-blu',
      databaseId: databaseId
    });

    const backupData: Record<string, any[]> = {};
    const collections = await db.listCollections();
    
    console.log(`Found ${collections.length} collections.`);

    for (const col of collections) {
      const colId = col.id;
      console.log(`  - Backing up collection: ${colId}...`);
      const snapshot = await col.get();
      backupData[colId] = [];

      snapshot.forEach(doc => {
        backupData[colId].push({
          id: doc.id,
          data: doc.data(),
          createTime: doc.createTime ? doc.createTime.toDate().toISOString() : null,
          updateTime: doc.updateTime ? doc.updateTime.toDate().toISOString() : null,
        });
      });
      console.log(`    ✅ Saved ${snapshot.size} documents.`);
    }

    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const outputPath = path.join(backupsDir, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`🎉 Backup completed successfully! Saved to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to backup database ${databaseId}:`, error);
  }
}

async function main() {
  // Database 1: ai-studio-...
  await backupDatabase(
    'ai-studio-3626ba3d-f6e9-4139-95a2-d41ff74762e6',
    'sierra-blu-494404-ai-studio.json'
  );

  // Database 2: remixed-...
  await backupDatabase(
    'remixed-firestore-database-id',
    'sierra-blu-494404-remixed.json'
  );
}

main().catch(err => {
  console.error('Fatal backup error:', err);
});
