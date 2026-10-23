import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to this script (apps/web/scripts)
const sourceDir = path.join(__dirname, '../../../packages/agents-core/src');
const destDir = path.join(__dirname, '../public/agents');

console.log(`[Copy Agent Profiles] Source: ${sourceDir}`);
console.log(`[Copy Agent Profiles] Destination: ${destDir}`);

try {
  // Ensure destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`[Copy Agent Profiles] Created destination directory`);
  }

  if (!fs.existsSync(sourceDir)) {
    console.error(`[Copy Agent Profiles] Error: Source directory does not exist!`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir);
  let copyCount = 0;

  for (const file of files) {
    if (file.endsWith('.md')) {
      const srcPath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, destPath);
      copyCount++;
    }
  }

  console.log(`[Copy Agent Profiles] Successfully copied ${copyCount} agent profiles (.md files).`);
} catch (error) {
  console.error('[Copy Agent Profiles] Error copying profiles:', error);
  process.exit(1);
}
