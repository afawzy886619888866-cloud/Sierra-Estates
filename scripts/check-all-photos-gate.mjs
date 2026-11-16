import fs from 'node:fs';
import path from 'node:path';

function parseJpegDimensions(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = ((buf[offset + 5] << 8) | buf[offset + 6]) >>> 0;
        const width = ((buf[offset + 7] << 8) | buf[offset + 8]) >>> 0;
        return { width, height };
      }
      const len = ((buf[offset + 2] << 8) | buf[offset + 3]) >>> 0;
      offset += 2 + len;
    }
  }
  return null;
}

const dir = 'data/whatsapp-phone-import/WhatsApp Chat with +20 11 13777964';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
console.log(`Total jpg files: ${files.length}`);

let passCount = 0;
let failCount = 0;

for (const f of files) {
  const p = path.join(dir, f);
  const buf = fs.readFileSync(p);
  const dims = parseJpegDimensions(buf);
  const pass = dims && dims.width >= 800 && dims.height >= 600;
  if (pass) passCount++;
  else failCount++;
}

console.log(`Property Finder 800x600 Gate Results:`);
console.log(`  PASSED: ${passCount} photos`);
console.log(`  FAILED: ${failCount} photos`);
