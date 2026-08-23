const fs = require('fs');
const path = require('path');
const http = require('http');

const ECC_DIR = path.resolve(__dirname, '..');
const OM_API = 'http://localhost:8080/memory/add';
const API_KEY = process.env.OM_API_KEY || 'local-dev-key';

// Only index specific context directories
const TARGET_DIRS = ['contexts', 'docs', 'rules', 'skills', 'research'];

async function addMemory(content, filename, tags) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      content: `[File: ${filename}]\n\n${content}`,
      tags: ['ecc', ...tags]
    });

    const req = http.request(OM_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function scanAndSync() {
  console.log('Starting ECC -> OpenMemory Sync...');
  let successCount = 0;
  let failCount = 0;

  for (const dirName of TARGET_DIRS) {
    const dirPath = path.join(ECC_DIR, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        // skip empty
        if (!content.trim()) continue;

        console.log(`Syncing ${dirName}/${file}...`);
        await addMemory(content, `${dirName}/${file}`, [dirName]);
        successCount++;
      } catch (err) {
        console.error(`Failed to sync ${file}:`, err.message);
        failCount++;
      }
    }
  }

  // Also sync root important files
  const ROOT_FILES = ['AGENTS.md', 'RULES.md', 'README.md', 'WORKING-CONTEXT.md'];
  for (const file of ROOT_FILES) {
    const fullPath = path.join(ECC_DIR, file);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      console.log(`Syncing root file ${file}...`);
      await addMemory(content, file, ['root', 'core']);
      successCount++;
    } catch (err) {
      console.error(`Failed to sync ${file}:`, err.message);
      failCount++;
    }
  }

  console.log(`Sync complete! Successfully added ${successCount} memories. Failed: ${failCount}`);
}

scanAndSync().catch(console.error);
