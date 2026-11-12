#!/usr/bin/env node
/**
 * check-css-modules-purity.mjs
 *
 * Enforces the REAL contract Next.js imposes on *.module.css: css-loader
 * runs with `modules.mode: "pure"` (next/dist/build/webpack/config/blocks/
 * css/loaders/modules.js — "Disallow global style exports so we can
 * code-split CSS"). In pure mode, postcss-modules-local-by-default rejects
 * any selector that does not carry at least one LOCAL class or id:
 *
 *   OK    .foo { }                          (local)
 *   OK    .foo :global(.bar) { }            (local + global mix)
 *   BAD    :global(.foo) { }                (fully global — needs a plain
 *                                           .css file or a local anchor)
 *   BAD    :global(.foo) svg, .baz { }      (any fully-global selector in
 *                                           the list poisons the rule)
 *
 * History (2026-11-12): CartographicMap.module.css shipped fully-global
 * selectors; the production build failed 3x deterministically while the CI
 * retry wrapper mislabeled it as the known next/font network flake. This
 * check runs before the build so the error is named file:line, fast.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(REPO, 'package.json'));
const postcss = require('postcss');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === '.next' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.module.css')) out.push(p);
  }
  return out;
}

/** True when the selector keeps at least one local class/id outside :global(). */
function hasLocalAnchor(sel) {
  const stripped = sel.replace(/:global\((?:[^()]|\([^()]*\))*\)/g, '');
  return /[.#][\w-]/.test(stripped);
}

const files = walk(REPO);
let violations = 0;
for (const file of files) {
  const css = readFileSync(file, 'utf8');
  const ast = postcss.parse(css, { from: file });
  ast.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name || '')) return;
    const selectors = rule.selector.split(',').map((s) => s.trim()).filter(Boolean);
    for (const sel of selectors) {
      if (!hasLocalAnchor(sel)) {
        violations++;
        console.error(`IMPURE  ${file.replace(REPO, '')}:${rule.source.start.line}  selector: ${sel}`);
        console.error('        pure-mode .module.css requires at least one local class/id; move fully-global styles to a plain .css file or anchor them to a local class.');
      }
    }
  });
}
console.log(`\n${files.length} module.css files scanned, ${violations} impure selector(s).`);
process.exit(violations > 0 ? 1 : 0);
