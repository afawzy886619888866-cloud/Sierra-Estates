import fs from 'node:fs';
import path from 'node:path';

const SRC = 'H:\\Sierra Estates';
const DST = process.env.SIERRA_MIRROR_DST || 'I:\\c files\\Sierra-Estates-Workspace-Backup';

function copyEnvFiles(dir) {
  if (!fs.existsSync(DST)) {
    console.log(`Target destination "${DST}" does not exist — skipping env mirror.`);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullSrc = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      copyEnvFiles(fullSrc);
    } else if (entry.name.startsWith('.env')) {
      const rel = path.relative(SRC, fullSrc);
      const fullDst = path.join(DST, rel);
      fs.mkdirSync(path.dirname(fullDst), { recursive: true });
      fs.copyFileSync(fullSrc, fullDst);
      console.log(`Copied: ${rel}`);
    }
  }
}

copyEnvFiles(SRC);
console.log(`✅ All .env files synced to ${DST}`);
