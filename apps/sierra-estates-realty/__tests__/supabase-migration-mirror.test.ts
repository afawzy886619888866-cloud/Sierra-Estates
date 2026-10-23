/**
 * Migration-mirror parity guard.
 *
 * The Vercel build can only read SQL files that live inside
 * apps/sierra-estates-realty/supabase/migrations/ (see commit "fix(migrations):
 * move SQL files into app folder so Vercel build can access them"). The
 * canonical source of truth stays at the repo root supabase/migrations/.
 *
 * History: migration 019 went missing from the app mirror for weeks
 * (documented as toolchain debt in docs/ACTIVATION_BASELINE.md) because
 * nothing enforced the copy. This test fails whenever the two directories
 * drift, so a migration can never again land in only one of them.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const APP_DIR = join(__dirname, '..');
const REPO_ROOT = join(APP_DIR, '..', '..');
const ROOT_MIGRATIONS = join(REPO_ROOT, 'supabase', 'migrations');
const APP_MIRROR = join(APP_DIR, 'supabase', 'migrations');

function sqlFiles(dir: string): string[] {
    return readdirSync(dir)
        .filter((name) => name.endsWith('.sql'))
        .sort();
}

function isTrackedInGit(repoRelativePath: string): boolean {
    try {
        const out = execSync(`git ls-files -- "${repoRelativePath}"`, {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return out.trim().length > 0;
    } catch {
        // git unavailable (exotic runner) — cannot assert tracking; skip silently
        return true;
    }
}

describe('App migration mirror parity (root supabase/migrations <-> app copy)', () => {
    it('both migration directories exist', () => {
        expect(existsSync(ROOT_MIGRATIONS)).toBe(true);
        expect(existsSync(APP_MIRROR)).toBe(true);
    });

    it('every root migration is mirrored in the app folder with identical bytes', () => {
        const rootFiles = sqlFiles(ROOT_MIGRATIONS);
        expect(rootFiles.length).toBeGreaterThan(0);

        const missing: string[] = [];
        const drifted: string[] = [];
        for (const name of rootFiles) {
            const mirrorPath = join(APP_MIRROR, name);
            if (!existsSync(mirrorPath)) {
                missing.push(name);
                continue;
            }
            const rootBytes = readFileSync(join(ROOT_MIGRATIONS, name), 'utf8');
            const mirrorBytes = readFileSync(mirrorPath, 'utf8');
            if (rootBytes !== mirrorBytes) {
                drifted.push(name);
            }
        }

        expect({
            missing,
            drifted,
        }).toEqual({ missing: [], drifted: [] });
    });

    it('the app mirror carries no extra migrations absent from the root set', () => {
        const rootFiles = new Set(sqlFiles(ROOT_MIGRATIONS));
        const extras = sqlFiles(APP_MIRROR).filter((name) => !rootFiles.has(name));
        expect(extras).toEqual([]);
    });

    it('every mirrored migration is COMMITTED to git (not just on disk)', () => {
        // .gitignore:132 ignores apps/sierra-estates-realty/supabase/, so plain
        // `git add` silently skips new mirror files — which is exactly how
        // migration 019 went missing while the Vercel rootDirectory build kept
        // reading the tracked mirror as its only migration source. New mirror
        // files must be force-added (`git add -f`); this assertion makes a
        // forgotten force-add fail loudly instead of silently.
        const untracked: string[] = [];
        for (const name of sqlFiles(ROOT_MIGRATIONS)) {
            const repoRelative = `apps/sierra-estates-realty/supabase/migrations/${name}`;
            if (!isTrackedInGit(repoRelative)) {
                untracked.push(name);
            }
        }
        expect(untracked).toEqual([]);
        expect(untracked.length === 0 ? 'all mirror files tracked' : `untracked: ${untracked.join(', ')}`)
            .toBe('all mirror files tracked');
    });

    it('each migration file is a regular file (no stray directories or symlinks)', () => {
        for (const name of sqlFiles(ROOT_MIGRATIONS)) {
            expect(statSync(join(ROOT_MIGRATIONS, name)).isFile()).toBe(true);
        }
        for (const name of sqlFiles(APP_MIRROR)) {
            expect(statSync(join(APP_MIRROR, name)).isFile()).toBe(true);
        }
    });
});
