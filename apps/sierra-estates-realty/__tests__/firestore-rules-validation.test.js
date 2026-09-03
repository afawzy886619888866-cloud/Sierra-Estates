 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Firestore Security Rules — Structural Validation Tests
 *
 * Validates the canonical firestore.rules file (deployed via firebase deploy)
 * has the expected security primitives, collection matches, and constraint
 * patterns. Catches regressions when someone edits the rules file.
 *
 * This does NOT run the emulator — see @firebase/rules-unit-testing for that.
 * These tests guard against accidental removal of critical rules.
 */

import * as fs from 'fs';
import * as path from 'path';

const RULES_PATH = path.resolve(__dirname, '../../../firestore.rules');
const rules = fs.readFileSync(RULES_PATH, 'utf-8');

describe('Firestore Security Rules — Structural Validation', () => {
  describe('1. Core guard functions', () => {
    it('defines isSignedIn()', () => {
      expect(rules).toMatch(/function isSignedIn\(\)\s*\{[^}]*request\.auth != null/);
    });

    it('defines isStaff() checking users/{uid}.role in [admin, manager, agent]', () => {
      expect(rules).toMatch(/function isStaff\(\)/);
      expect(rules).toMatch(/get\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.role in \['admin',\s*'manager',\s*'agent'\]/);
    });
  });

  describe('2. Public marketplace catalog — read: true, write: isStaff()', () => {
    const publicCollections = [
      'listings',
      'units',
      'properties',
      'projects',
      'developers',
      'mediaAssets',
      'media',
      'zones',
      'houyez_listings',
      'houyez_compounds',
    ];

    it.each(publicCollections)('allows public read for /%s', (col) => {
      const re = new RegExp(
        `match /${col}/\\{id\\}\\s*\\{[^}]*allow read:\\s*if true`
      );
      expect(rules).toMatch(re);
    });

    it.each(publicCollections)('restricts write for /%s to staff', (col) => {
      const re = new RegExp(
        `match /${col}/\\{id\\}\\s*\\{[^}]*allow write:\\s*if isStaff\\(\\)`
      );
      expect(rules).toMatch(re);
    });
  });

  describe('3. Inquiries & Careers — staff-only, no anonymous create', () => {
    // These collections are written exclusively by the Admin SDK in
    // app/api/inquiries/route.ts and app/api/careers/apply/route.ts, which
    // enforce zod validation and a 24 KB body cap. An anonymous `allow create`
    // bypasses both. It also guarded a payload shape nothing produces: the
    // inquiries API writes status 'S1_NEW_LEAD' (not 'new'), and career
    // applications go to `career_applications`, not `careers`.
    it.each(['inquiries', 'careers'])(
      'grants no anonymous create on /%s',
      (col) => {
        const block = rules.match(
          new RegExp(`match /${col}/\\{id\\}\\s*\\{[\\s\\S]*?\\n    \\}`)
        );
        expect(block).not.toBeNull();
        expect(block[0]).not.toMatch(/allow create/);
      }
    );

    it.each(['inquiries', 'careers'])(
      'restricts /%s entirely to staff',
      (col) => {
        const re = new RegExp(
          `match /${col}/\\{id\\}[\\s\\S]*?allow read, write:\\s*if isStaff\\(\\)`
        );
        expect(rules).toMatch(re);
      }
    );
  });

  describe('4. Share links — constrained analytics updates', () => {
    it('allows public GET on /proposals/{id}', () => {
      expect(rules).toMatch(
        /match \/proposals\/\{id\}[\s\S]*?allow get:\s*if true/
      );
    });

    it('allows public update on /proposals/{id} only for viewCount + lastViewedAt', () => {
      expect(rules).toMatch(
        /match \/proposals\/\{id\}[\s\S]*?hasOnly\(\['viewCount',\s*'lastViewedAt'\]\)/
      );
    });

    it('allows public GET on /concierge_selections/{id}', () => {
      expect(rules).toMatch(
        /match \/concierge_selections\/\{id\}[\s\S]*?allow get:\s*if true/
      );
    });

    it('allows public update on /concierge_selections/{id} only for engagement', () => {
      expect(rules).toMatch(
        /match \/concierge_selections\/\{id\}[\s\S]*?hasOnly\(\['engagement'\]\)/
      );
    });
  });

  describe('5. Users — self-read + staff-write', () => {
    it('allows users to read their own document', () => {
      expect(rules).toMatch(
        /match \/users\/\{uid\}[\s\S]*?allow read:\s*if isSignedIn\(\) && \(request\.auth\.uid == uid \|\| isStaff\(\)\)/
      );
    });

    // The earlier rule only blocked changing `role` on your OWN document, which
    // still let any isStaff() caller — agents included — promote a colleague, or
    // demote every admin and lock the org out. Role writes now require isAdmin()
    // on ANY document; non-role fields stay staff-writable.
    it('allows staff to update a user doc only when `role` is untouched', () => {
      expect(rules).toMatch(
        /match \/users\/\{uid\}[\s\S]*?allow update:\s*if \(isStaff\(\)[\s\S]*?!request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasAny\(\['role'\]\)\)/
      );
    });

    it('requires isAdmin() to write the role field on any user doc', () => {
      const usersBlock = _nullishCoalesce(_optionalChain([rules, 'access', _ => _.match, 'call', _2 => _2(/match \/users\/\{uid\}[\s\S]*?\n    \}/), 'optionalAccess', _3 => _3[0]]), () => ( ''));
      expect(usersBlock).toMatch(/allow update:[\s\S]*?\|\|\s*isAdmin\(\)/);
      // The self-only carve-out must be gone — it was the bug.
      expect(usersBlock).not.toMatch(/request\.auth\.uid != uid/);
    });

    it('restricts user provisioning and removal to admins', () => {
      expect(rules).toMatch(
        /match \/users\/\{uid\}[\s\S]*?allow create, delete:\s*if isAdmin\(\)/
      );
    });

    it('defines an isAdmin() helper distinct from isStaff()', () => {
      expect(rules).toMatch(/function isAdmin\(\)[\s\S]*?\.role == 'admin'/);
    });
  });

  describe('6. Audit log immutability', () => {
    it('allows staff read and create on engine_memory_audit', () => {
      expect(rules).toMatch(
        /match \/engine_memory_audit\/\{id\}[\s\S]*?allow read:\s*if isStaff\(\)[\s\S]*?allow create:\s*if isStaff\(\)/
      );
    });

    it('blocks update and delete on engine_memory_audit (immutable)', () => {
      expect(rules).toMatch(
        /match \/engine_memory_audit\/\{id\}[\s\S]*?allow update, delete:\s*if false/
      );
    });
  });

  describe('7. Catch-all rule', () => {
    it('has a catch-all staff-only rule for uncategorized collections', () => {
      expect(rules).toMatch(
        /match \/\{collection\}\/\{document=\*\*\}[\s\S]*?allow read, write:\s*if isStaff\(\)/
      );
    });

    it('excludes users and audit_logs from the catch-all so it cannot re-grant them', () => {
      expect(rules).toMatch(
        /match \/\{collection\}\/\{document=\*\*\}[\s\S]*?!\(collection in \['users', 'audit_logs'\]\)/
      );
    });

    it('makes audit_logs client-read-only for admins', () => {
      expect(rules).toMatch(
        /match \/audit_logs\/\{document=\*\*\}[\s\S]*?allow read:\s*if isAdmin\(\)[\s\S]*?allow write:\s*if false/
      );
    });
  });

  describe('8. No wildcard writes without auth', () => {
    it('contains no allow write: if true anywhere', () => {
      expect(rules).not.toMatch(/allow\s+(write|create|update|delete):\s*if true/);
    });
  });

  describe('9. No anonymous admin provisioning', () => {
    it('contains no allow write on users/{uid} without isStaff', () => {
      // The only write rule for /users/{uid} must be staff-gated
      const usersMatch = rules.match(/match \/users\/\{uid\}\s*\{([\s\S]*?)\n\s*\}/);
      expect(usersMatch).not.toBeNull();
      if (usersMatch) {
        const block = usersMatch[1];
        // Every allow write/create/update in this block must reference isStaff
        const writeRules = block.match(/allow\s+(write|create|update|delete):[^;]+;/g) || [];
        for (const rule of writeRules) {
          expect(rule).toMatch(/isStaff\(\)/);
        }
      }
    });
  });
});
