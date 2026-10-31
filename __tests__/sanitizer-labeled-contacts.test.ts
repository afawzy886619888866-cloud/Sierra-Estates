import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');
const SANITIZER = path.join(ROOT_DIR, 'scripts', 'sanitize-data-json.mjs');
const PF_FEED = path.join(ROOT_DIR, 'docs', 'drafts', 'propertyfinder', 'propertyfinder-full-feed.xml');

/**
 * Drives the REAL scrubText() from scripts/sanitize-data-json.mjs (v3).
 * The sanitizer is a script with side effects (it rewrites target files on
 * import), so the test cuts the source at the "── Run ──" marker and feeds
 * the library half to node as an ES module that scrubs stdin → stdout.
 * This pins the labeled-context malformed-contact pass that closed the
 * 2026-10-31 audit blind spots ("contact: 11155953366",
 * "رقم المالك: +20 10 2924495") — a regression here reintroduces real
 * owner-mobile leaks into committed data.
 */
function scrubViaSanitizer(inputs: string[]): string[] {
  const src = fs.readFileSync(SANITIZER, 'utf-8');
  const cut = src.indexOf('// ── Run ─');
  expect(cut, 'sanitizer must keep a "── Run ──" section separable from its library half').toBeGreaterThan(0);
  const lib = src.slice(0, cut);
  const driver = `${lib}
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(input.map((s) => scrubText(s))));
`;
  const res = spawnSync(process.execPath, ['--input-type=module', '-e', driver], {
    input: JSON.stringify(inputs),
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 64 * 1024 * 1024, // the PF feed round-trip needs > the 1 MB default
  });
  if (res.status !== 0) throw new Error(`sanitizer driver failed: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

describe('Sanitizer v3 — labeled-context malformed contacts', () => {
  it('scrubs an 11-digit mistyped contact under an explicit label', () => {
    const [out] = scrubViaSanitizer(['contact: 11155953366 | name: دكتور علي']);
    expect(out).toContain('+201092048333');
    expect(out).not.toContain('11155953366');
  });

  it('scrubs a 9-digit truncated owner number under رقم المالك (with LRM mark)', () => {
    const [out] = scrubViaSanitizer(['رقم المالك: \u200e+20 10 2924495 | Exclusive luxury Townhouse']);
    expect(out).toContain('+201092048333');
    expect(out).not.toContain('2924495');
  });

  it('scrubs spaced and dashed labeled forms', () => {
    const [a, b] = scrubViaSanitizer(['phone: +20 100 882 1490 (Owner Direct)', 'tel: 011-0088-8834']);
    expect(a).not.toContain('882 1490');
    expect(b).not.toContain('0088-8834');
    expect(a).toContain('+201092048333');
    expect(b).toContain('+201092048333');
  });

  it('is idempotent on the concierge number', () => {
    const [out] = scrubViaSanitizer(['contact: +201092048333']);
    expect(out).toBe('contact: +201092048333');
  });

  it('does NOT touch unlabeled digit runs (ids, timestamps, jids, prices)', () => {
    const inputs = [
      '"id": "478BD5DE-2EE3-4104-9325-375FC1E2853F"',
      '"taskId": "outreach-1790210062146-10"',
      '"createdAt": "2026-09-24T00:34:22.056Z"',
      '"groupId": "120363044918239011@g.us"',
      'price: 135,000 EGP',
      // NOTE: a free-text 10-digit price shaped exactly like an Egyptian
      // mobile ("contact price: 1100000000 EGP") IS scrubbed by the v2
      // PHONE_RE pass — a pre-existing, documented trade-off (prices are
      // protected by KEY/column awareness, not free text). Comma-grouped
      // prices are safe and pinned here instead:
      'contact price: 9,500,000 EGP',
      'Rustam, BRN#27834 +971509910434', // UAE broker, no label
    ];
    const outs = scrubViaSanitizer(inputs);
    outs.forEach((out, i) => expect(out, `case ${i}: ${inputs[i]}`).toBe(inputs[i]));
  });

  it('the sanitizer source carries the labeled pass and its verification twin', () => {
    const src = fs.readFileSync(SANITIZER, 'utf-8');
    expect(src).toContain('scrubLabeledContacts');
    expect(src).toContain('labeledLeftovers');
    expect(src).toContain('LABEL_BEFORE_RE');
    // all three verification paths include the labeled check
    expect(src).toMatch(/phoneLeftoversRaw[\s\S]{0,400}labeledLeftovers\(raw\)/);
    expect(src).toMatch(/labeledLeftovers\(node\)/);
    expect(src).toMatch(/labeledLeftovers\(v\)/);
  });

  it('the committed PF draft feed carries no labeled non-concierge contact', () => {
    if (!fs.existsSync(PF_FEED)) return; // feed is generated content — skip when absent
    const raw = fs.readFileSync(PF_FEED, 'utf8');
    // The two audit leaks must never come back:
    expect(raw).not.toContain('11155953366');
    expect(raw).not.toContain('2924495');
    // and scrubbing the whole feed again must be a no-op (fixed point):
    // any diff would mean a labeled non-concierge contact survived.
    const [out] = scrubViaSanitizer([raw]);
    expect(out).toBe(raw);
  });
});
