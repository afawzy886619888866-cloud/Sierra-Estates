import fs from 'node:fs';
import path from 'node:path';

const SRC = 'H:\\Sierra Estates';
const DST = 'C:\\Users\\Sierr\\Sierra-Estates-Workspace';

function copyEnvFiles(dir) {
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
console.log('✅ All .env files mirrored to C:\\Users\\Sierr\\Sierra-Estates-Workspace');
