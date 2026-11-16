const fs = require('fs');
const path = require('path');

const STATIC_DIR = path.resolve('apps/sierra-estates-realty/.next/static');
const CONCIERGE = '201092048333';
const CONCIERGE_LOCAL = '01092048333';

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (/\.js$/.test(item)) files.push(full);
  }
  return files;
}

const files = walk(STATIC_DIR);
let hits = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  // Match 1: Quoted or bounded 01[0125]xxxxxxxx
  const localMatches = content.match(/["'`\s:=](01[0125]\d{8})["'`\s&,;]/g) || [];
  for (const m of localMatches) {
    const num = m.match(/01[0125]\d{8}/)[0];
    if (num !== CONCIERGE_LOCAL) {
      hits.push({ file: path.relative(STATIC_DIR, file), num, match: m });
    }
  }

  // Match 2: International +201... or 201... in wa.me or quotes
  const intlMatches = content.match(/["'`\s:=/](201[0125]\d{8})["'`\s&,;]/g) || [];
  for (const m of intlMatches) {
    const num = m.match(/201[0125]\d{8}/)[0];
    if (num !== CONCIERGE) {
      hits.push({ file: path.relative(STATIC_DIR, file), num, match: m });
    }
  }

  // Match 3: wa.me links
  const waMatches = content.match(/wa\.me\/(?:%2B|\+)?(\d+)/g) || [];
  for (const m of waMatches) {
    const num = m.replace(/wa\.me\/(?:%2B|\+)?/, '');
    if (num !== CONCIERGE) {
      hits.push({ file: path.relative(STATIC_DIR, file), num, match: m });
    }
  }
}

console.log(`Scanned ${files.length} static JS chunks.`);
console.log(`Hits for non-concierge Egyptian phone numbers:`, hits.length);
if (hits.length > 0) {
  console.log(hits);
  process.exit(1);
} else {
  console.log('✅ ZERO non-concierge Egyptian phone numbers found in any client JS bundle!');
  process.exit(0);
}
