/**
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

  describe('3. Inquiries & Careers — anonymous create with constraints', () => {
    it.each(['inquiries', 'careers'])(
      'allows anonymous create on /%s with status=new and size<=40',
      (col) => {
        const re = new RegExp(
          `match /${col}/\\{id\\}[\\s\\S]*?allow create:\\s*if request\\.resource\\.data\\.status == 'new'\\s*&&\\s*request\\.resource\\.data\\.size\\(\\) <= 40`
        );
        expect(rules).toMatch(re);
      }
    );

    it.each(['inquiries', 'careers'])(
      'restricts read/update/delete on /%s to staff',
      (col) => {
        const re = new RegExp(
          `match /${col}/\\{id\\}[\\s\\S]*?allow read, update, delete:\\s*if isStaff\\(\\)`
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

    it('restricts user writes to staff only (prevents self privilege escalation)', () => {
      expect(rules).toMatch(
        /match \/users\/\{uid\}[\s\S]*?allow write:\s*if isStaff\(\)/
      );
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
        /match \/\{document=\*\*\}[\s\S]*?allow read, write:\s*if isStaff\(\)/
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
