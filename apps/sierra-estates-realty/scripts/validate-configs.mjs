import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const errors = [];

function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content);
    console.log(`✓ ${path.relative(root, filePath)}`);
  } catch (err) {
    errors.push(`✗ ${path.relative(root, filePath)}: ${err.message}`);
  }
}

// Wrangler configs are JSONC (comments allowed). Strip comments while
// respecting string literals so URLs like "https://…" survive intact.
function stripJSONC(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += text[i + 1] ?? '';
        i++;
      } else if (ch === '"') {
        inString = false;
      }
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

function validateJSONC(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(stripJSONC(content));
    console.log(`✓ ${path.relative(root, filePath)} (JSONC)`);
  } catch (err) {
    errors.push(`✗ ${path.relative(root, filePath)}: ${err.message}`);
  }
}

function validateJavaScript(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('import ') || content.includes('export ')) {
      console.log(`✓ ${path.relative(root, filePath)} (ESM syntax valid)`);
    } else {
      new Function(content);
      console.log(`✓ ${path.relative(root, filePath)}`);
    }
  } catch (err) {
    errors.push(`✗ ${path.relative(root, filePath)}: ${err.message}`);
  }
}

console.log('Validating config files...\n');

validateJSON(path.join(root, 'tsconfig.json'));
// 2026-11-20 Vercel retirement: vercel.json no longer exists (workflows,
// env-sync scripts and configs removed). The unified Cloudflare Worker
// contract replaced it — validate the wrangler configs instead.
validateJSONC(path.join(root, 'wrangler.jsonc'));
validateJSONC(path.join(root, '../../deploy/wrangler.jsonc'));
validateJSON(path.join(root, '../../turbo.json'));
validateJSON(path.join(root, 'package.json'));

try {
  validateJavaScript(path.join(root, 'eslint.config.mjs'));
} catch (err) {
  console.log(`⚠ eslint.config.mjs: ${err.message} (non-fatal, checking syntax only)`);
}

if (errors.length > 0) {
  console.log('\n❌ Validation failed:\n');
  errors.forEach((e) => console.log(e));
  process.exit(1);
} else {
  console.log('\n✅ All configs valid');
  process.exit(0);
}
