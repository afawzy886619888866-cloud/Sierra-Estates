import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const dedupe = require('../lib/outreach-dedupe');

describe('Owner outreach zero-duplicate atomic claim guard', () => {
  it('claims a fresh phone once and strictly rejects a 23505 duplicate claim', async () => {
    const claimed = new Set<string>();
    const mockDb = {
      from: (table: string) => ({
        insert: async (row: { phone: string }) => {
          expect(table).toBe('owner_outreach_claims');
          if (claimed.has(row.phone)) {
            return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
          }
          claimed.add(row.phone);
          return { error: null };
        },
      }),
    };

    const first = await dedupe.claimOutreachPhone(mockDb, {
      phone: '01012345678',
      source: '09-owner-outreach:split',
      listingCode: 'SE-1',
    });
    expect(first).toEqual({ claimed: true, reason: 'claimed' });

    // Second attempt with equivalent Egyptian format (+201012345678) MUST be blocked
    const second = await dedupe.claimOutreachPhone(mockDb, {
      phone: '+201012345678',
      source: '13-paced-outreach:active-renting',
      listingCode: 'SE-1',
    });
    expect(second).toEqual({ claimed: false, reason: 'already_claimed_in_db' });
  });

  it('loadAllClaimedPhones merges DB claims, DB logs, and both local JSONL ledgers', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sierra-dedupe-'));
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'owner-outreach-ledger.jsonl'),
        JSON.stringify({ phone: '01011112222', dryRun: false }) + '\n' +
        JSON.stringify({ phone: '01099998888', dryRun: true }) + '\n',
      );
      fs.writeFileSync(
        path.join(tmpDir, 'paced-outreach-ledger.jsonl'),
        JSON.stringify({ phone: '201122223333', dryRun: false }) + '\n',
      );

      const mockDb = {
        from: (table: string) => ({
          select: () => ({
            range: async () => {
              if (table === 'owner_outreach_claims') {
                return { data: [{ phone: '201233334444' }], error: null };
              }
              if (table === 'owner_outreach_log') {
                return { data: [{ phone: '201544445555' }], error: null };
              }
              return { data: [], error: null };
            },
          }),
        }),
      };

      const set = await dedupe.loadAllClaimedPhones(mockDb, tmpDir);
      expect(set.has('201011112222')).toBe(true);
      expect(set.has('201122223333')).toBe(true);
      expect(set.has('201233334444')).toBe(true);
      expect(set.has('201544445555')).toBe(true);
      // Dry-run entries must NOT pollute the real contacted set
      expect(set.has('201099998888')).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('wires atomic claimOutreachPhone before sendText in both 09-owner-outreach and 13-paced-outreach', () => {
    const outreachSrc = fs.readFileSync(path.join(__dirname, '..', '09-owner-outreach', 'outreach.js'), 'utf8');
    const pacedSrc = fs.readFileSync(path.join(__dirname, '..', '13-paced-outreach', 'paced-outreach.js'), 'utf8');

    expect(outreachSrc).toContain('claimOutreachPhone');
    expect(outreachSrc.indexOf('claimOutreachPhone(')).toBeLessThan(outreachSrc.indexOf('gw.sendText('));

    expect(pacedSrc).toContain('claimOutreachPhone');
    expect(pacedSrc.indexOf('claimOutreachPhone(')).toBeLessThan(pacedSrc.indexOf('gateway.sendText('));
  });
});
