import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const generatedDirectories = [
  '.next',
  '.turbo',
  '.vercel',
  'node_modules',
  'dist',
  'coverage',
  '.reports',
];

const protectedDirectories = [
  '.agents',
  '.amphion',
  '.claude',
  'docs/archive',
  'tools',
  'workflows',
];

const trackedFiles = execFileSync('git', ['ls-files'], {
  cwd: root,
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);

const existingGenerated = generatedDirectories
  .filter((directory) => existsSync(join(root, directory)))
  .map((directory) => ({
    path: directory,
    kind: 'generated',
    action: 'regenerable; review locally before removal',
  }));

const trackedProtected = trackedFiles
  .filter((file) =>
    protectedDirectories.some(
      (directory) => file === directory || file.startsWith(`${directory}/`),
    ),
  )
  .map((file) => ({
    path: file,
    kind: 'tracked-operational',
    action: 'retain until reference review proves it is unused',
  }));

const secretLike = trackedFiles
  .filter((file) => /(^|\/)(\.env(?!\.example)|.*(secret|credential|service-account|private-key).*)$/i.test(file))
  .map((file) => ({
    path: file,
    kind: 'sensitive-name',
    action: 'inspect and rotate externally; never copy into deployment sources',
  }));

const summary = {
  repository: root,
  readOnly: true,
  trackedFileCount: trackedFiles.length,
  generatedDirectories: existingGenerated,
  protectedTrackedFiles: trackedProtected,
  sensitiveNameMatches: secretLike,
  notes: [
    'This report is classification only and performs no deletion.',
    'Provider resources require authenticated, separately approved inspection.',
  ],
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
