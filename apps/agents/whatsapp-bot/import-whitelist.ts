import fs from 'fs';
import path from 'path';

const whitelistPath = path.resolve(__dirname, 'whitelist.json');
const targetFile = process.argv[2] || path.resolve(__dirname, '../../../clients.csv');

interface WhitelistConfig {
  enabled: boolean;
  numbers: string[];
}

function normalizePhone(phoneStr: string): string {
  return phoneStr.replace(/\D/g, '');
}

function loadWhitelist(): WhitelistConfig {
  try {
    if (fs.existsSync(whitelistPath)) {
      return JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
    }
  } catch (err) {
    console.error('⚠️ Failed to read whitelist.json:', err);
  }
  return { enabled: true, numbers: [] };
}

function saveWhitelist(config: WhitelistConfig) {
  try {
    fs.writeFileSync(whitelistPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️ Failed to write whitelist.json:', err);
  }
}

async function main() {
  console.log(`📋 Starting Whitelist Import from: ${targetFile}`);

  if (!fs.existsSync(targetFile)) {
    console.error(`❌ File not found: ${targetFile}`);
    console.error('Usage: npx tsx import-whitelist.ts [path-to-file.csv]');
    console.error('Or place a clients.csv in the project root directory.');
    process.exit(1);
  }

  const content = fs.readFileSync(targetFile, 'utf8');
  // Split by line or comma or semicolon
  const lines = content.split(/[\r\n,;]+/).map(line => line.trim()).filter(Boolean);

  const config = loadWhitelist();
  let imported = 0;
  let existing = 0;
  let invalid = 0;

  for (const line of lines) {
    // Strip header if present (e.g. phone, number, client, etc.)
    if (/^(phone|number|client|mobile)$/i.test(line)) {
      continue;
    }

    const clean = normalizePhone(line);
    // Basic validation: must be at least 7 digits (standard international numbers)
    if (clean.length < 7) {
      invalid++;
      continue;
    }

    if (!config.numbers.includes(clean)) {
      config.numbers.push(clean);
      imported++;
    } else {
      existing++;
    }
  }

  saveWhitelist(config);

  console.log('\n============================================================');
  console.log(`✅ Import finished successfully!`);
  console.log(`   - Imported: ${imported}`);
  console.log(`   - Existing: ${existing}`);
  console.log(`   - Invalid:  ${invalid}`);
  console.log(`   - Total in Whitelist: ${config.numbers.length}`);
  console.log('============================================================\n');
}

main().catch(console.error);
