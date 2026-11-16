const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  for (const file of fs.readdirSync(dir)) {
    if (['node_modules', '.next', '.git'].includes(file)) continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('use client') && /from\s+['"][^'"]*\.json['"]/.test(content)) {
        const matches = content.match(/import\s+.*?from\s+['"][^'"]*\.json['"]/g) || [];
        results.push({ file: full, imports: matches });
      }
    }
  }
  return results;
}

const found = walk('apps/sierra-estates-realty');
console.log(JSON.stringify(found, null, 2));
