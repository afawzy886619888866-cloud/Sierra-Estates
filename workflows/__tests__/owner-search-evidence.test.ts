/**
 * Tests: workflows/02-owner-search owner-evidence rules (2026-10-25).
 *
 * The ACTIVE runner dispatches this workflow (runner.js SCRIPTS map). The
 * previous implementation had two fabrication paths:
 *   · contact = unit.owner?.phone || unit.agent?.phone || 'No contact' —
 *     broker phones landed in the owner_leads sheet (workflow 03 then
 *     texted brokers as if they were owners) and empty rows were appended;
 *   · a malformed PF API payload (data.data not an array) was coerced to
 *     [] — an extraction failure reported as a successful empty search.
 *
 * Pinned here: positive owner evidence only, owner-phone-only rows, and
 * the malformed-response guard (asserted against the source text because
 * the workflow is spawned as a child process by the runner).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);
const workflowPath = path.resolve(__dirname, '..', '02-owner-search', 'search.js');
const { hasOwnerEvidence, buildLeadRow } = req(workflowPath);

describe('workflows/02-owner-search — owner evidence rules', () => {
  it('accepts rows with positive owner evidence (owner.phone present)', () => {
    expect(hasOwnerEvidence({ owner: { phone: '201000000001' } })).toBe(true);
    expect(hasOwnerEvidence({ owner: { phone: '  ' } })).toBe(false);
  });

  it('rejects broker-only rows — a missing owner phone is NEVER owner evidence', () => {
    expect(hasOwnerEvidence({ agent: { phone: '201111111111', name: 'Broker X' } })).toBe(false);
    expect(hasOwnerEvidence({})).toBe(false);
    expect(hasOwnerEvidence(null)).toBe(false);
    expect(hasOwnerEvidence({ owner: { name: 'no phone' } })).toBe(false);
  });

  it('builds lead rows with the OWNER phone only — never the agent fallback', () => {
    const row = buildLeadRow({
      title: 'Villa in Mivida',
      price: 12_000_000,
      location: { name: 'Mivida' },
      beds: 4,
      baths: 3,
      area: 350,
      owner: { phone: ' 201000000001 ' },
      agent: { phone: '201111111111' },
      url: 'https://pf.eg/villa',
    });
    expect(row[6]).toBe('201000000001'); // owner phone, trimmed
    expect(row[6]).not.toBe('201111111111'); // agent phone never substituted
    expect(row[8]).toBe('PENDING'); // status col consumed by workflow 03
    expect(row[1]).toBe('property_finder');
  });

  it('never writes "No contact" placeholder rows (source-level contract)', () => {
    // Strip comments — the docstring documents the removed anti-pattern;
    // the contract is that no EXECUTABLE code contains it.
    const code = fs.readFileSync(workflowPath, 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain("'No contact'");
    // The broker-phone fallback chain is gone from the source entirely.
    expect(code).not.toMatch(/owner\?\.phone\s*\|\|\s*unit\?\.agent\?\.phone/);
  });

  it('treats malformed API payloads as failures, not empty searches (source-level contract)', () => {
    const code = fs.readFileSync(workflowPath, 'utf-8');
    // The silent [] coercion is gone…
    expect(code).not.toMatch(/Array\.isArray\(data\?\.data\)\s*\?\s*data\.data\s*:\s*\[\]/);
    // …replaced by a fail-loud guard.
    expect(code).toContain('!Array.isArray(data.data)');
    expect(code).toContain('malformed response');
  });

  it('respects source rate limits: HTTP 429 fails the run instead of silently ending', () => {
    const code = fs.readFileSync(workflowPath, 'utf-8');
    expect(code).toContain('429');
    expect(code).toContain('rate limited');
  });
});
