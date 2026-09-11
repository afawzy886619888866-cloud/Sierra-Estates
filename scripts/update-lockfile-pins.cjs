const fs = require('fs');

let lock = fs.readFileSync('pnpm-lock.yaml', 'utf8');

// 1. Replace references in dependencies
lock = lock.replace(/(\bjs-yaml:\s*)3\.15\.1/g, '$13.15.2');
lock = lock.replace(/(\buuid:\s*)9\.0\.1/g, '$111.1.1');
lock = lock.replace(/(\bsharp:\s*)0\.35\.3/g, '$10.35.4');

// 2. Remove packages and snapshots for target versions using line processing
const lines = lock.split('\n');
const output = [];
let skipping = false;
let currentIndent = 0;

function shouldSkip(header) {
  if (header.startsWith('  js-yaml@3.15.1:') ||
      header.startsWith('  uuid@9.0.1:') ||
      header.startsWith('  sharp@0.35.3:') ||
      header.startsWith('  vitest@4.1.10:') ||
      header.startsWith('  @img/sharp-') && header.includes('@0.35.3:') ||
      header.startsWith('  @img/sharp-libvips-') && header.includes('@1.3.2:') ||
      header.startsWith('  sharp@0.35.3(') ||
      header.startsWith('  vitest@4.1.10(') ||
      header.startsWith('  js-yaml@3.15.1:') ||
      header.startsWith('  uuid@9.0.1:') ||
      header.startsWith('  @img/sharp-') && header.includes('@0.35.3') ||
      header.startsWith('  @img/sharp-libvips-') && header.includes('@1.3.2')) {
    return true;
  }
  return false;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Package/snapshot headers start with 2 spaces: "  pkg@version...:"
  if (/^  ['"]?[@a-zA-Z0-9_\-\.\/]+@[^:]+.*:/.test(line)) {
    if (shouldSkip(line)) {
      skipping = true;
      continue;
    } else {
      skipping = false;
    }
  } else if (skipping) {
    // If we're skipping, any line indented with 4 or more spaces belongs to this block
    if (/^    /.test(line) || line.trim() === '') {
      continue;
    } else {
      // Reached a new top-level or different section
      skipping = false;
    }
  }
  output.push(line);
}

fs.writeFileSync('pnpm-lock.yaml', output.join('\n'), 'utf8');
console.log('pnpm-lock.yaml updated.');
