import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('owner outreach scheduler dry-run safety', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'scripts', 'run-owner-outreach-scheduler.ts'),
    'utf8',
  );

  it('returns from dry-run before reaching the enqueue call', () => {
    const dryRunBranch = source.match(/if\s*\(DRY_RUN\)\s*\{([^}]*)\}/s);
    const enqueueCall = source.indexOf('OwnerOutreachService.enqueueBatch');

    expect(dryRunBranch).not.toBeNull();
    expect(dryRunBranch?.[1]).toContain('return;');
    expect(dryRunBranch?.[1]).not.toContain('enqueueBatch');
    expect(enqueueCall).toBeGreaterThan(-1);
    expect(source.indexOf(dryRunBranch?.[0] ?? '')).toBeLessThan(enqueueCall);
  });
});
