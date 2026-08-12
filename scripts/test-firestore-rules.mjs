// Emulator unit tests for apps/sierra-estates-realty/firestore.rules
// (the canonical rules file deployed via the root firebase.json).
//
// Run from the repo root:
//   npm i --no-save @firebase/rules-unit-testing firebase   # one-off, not in any workspace
//   npx -y firebase-tools emulators:exec --only firestore --project demo-sierra \
//     "node scripts/test-firestore-rules.mjs"
//
// Exits non-zero if any assertion fails. Re-run after ANY change to the rules
// and BEFORE `firebase deploy --only firestore:rules`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, Timestamp,
} from 'firebase/firestore';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const RULES = readFileSync(
  join(repoRoot, 'apps/sierra-estates-realty/firestore.rules'),
  'utf8',
);

let pass = 0;
let fail = 0;
async function t(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL  ${name}\n      ${e.message.split('\n')[0]}`);
  }
}

const env = await initializeTestEnvironment({
  projectId: 'demo-sierra',
  firestore: { host: '127.0.0.1', port: 8080, rules: RULES },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users/agent1'), { role: 'agent', name: 'Agent One' });
  await setDoc(doc(db, 'users/manager1'), { role: 'manager' });
  await setDoc(doc(db, 'users/admin1'), { role: 'admin' });
  await setDoc(doc(db, 'users/visitor1'), { role: 'client' });
  await setDoc(doc(db, 'proposals/p1'), { leadName: 'secret', viewCount: 0 });
  await setDoc(doc(db, 'concierge_selections/c1'), { leadId: 'l1', engagement: {} });
  await setDoc(doc(db, 'listings/pub1'), { status: 'published', title: 'x' });
  await setDoc(doc(db, 'listings/draft1'), { status: 'draft', title: 'y' });
  await setDoc(doc(db, 'leads/lead1'), { phone: '+20100' });
});

const anon = env.unauthenticatedContext().firestore();
const agent = env.authenticatedContext('agent1').firestore();
const admin = env.authenticatedContext('admin1').firestore();
const visitor = env.authenticatedContext('visitor1').firestore();

console.log('\n— share links: get public, list staff-only —');
await t('anon GET proposals/p1 allowed', () =>
  assertSucceeds(getDoc(doc(anon, 'proposals/p1'))));
await t('anon LIST proposals denied', () =>
  assertFails(getDocs(collection(anon, 'proposals'))));
await t('anon LIST concierge_selections denied', () =>
  assertFails(getDocs(collection(anon, 'concierge_selections'))));
await t('staff LIST proposals allowed', () =>
  assertSucceeds(getDocs(collection(agent, 'proposals'))));

console.log('\n— share links: constrained typed analytics writes —');
await t('anon update viewCount(int)+lastViewedAt(ts) allowed', () =>
  assertSucceeds(updateDoc(doc(anon, 'proposals/p1'),
    { viewCount: 1, lastViewedAt: Timestamp.now() })));
await t('anon update viewCount with string denied', () =>
  assertFails(updateDoc(doc(anon, 'proposals/p1'),
    { viewCount: 'evil', lastViewedAt: Timestamp.now() })));
await t('anon update other field (leadName) denied', () =>
  assertFails(updateDoc(doc(anon, 'proposals/p1'), { leadName: 'x' })));
await t('anon update engagement(map) allowed', () =>
  assertSucceeds(updateDoc(doc(anon, 'concierge_selections/c1'),
    { engagement: { clicked: true } })));
await t('anon update engagement(string) denied', () =>
  assertFails(updateDoc(doc(anon, 'concierge_selections/c1'), { engagement: 'x' })));

console.log('\n— users: role escalation blocked —');
await t('agent self role->admin denied', () =>
  assertFails(updateDoc(doc(agent, 'users/agent1'), { role: 'admin' })));
await t('agent edit other user role denied', () =>
  assertFails(updateDoc(doc(agent, 'users/visitor1'), { role: 'admin' })));
await t('agent non-role profile update allowed', () =>
  assertSucceeds(updateDoc(doc(agent, 'users/agent1'), { name: 'New Name' })));
await t('agent create users doc denied', () =>
  assertFails(setDoc(doc(agent, 'users/newguy'), { role: 'agent' })));
await t('admin change role allowed', () =>
  assertSucceeds(updateDoc(doc(admin, 'users/agent1'), { role: 'manager' })));
await t('admin create users doc allowed', () =>
  assertSucceeds(setDoc(doc(admin, 'users/newguy'), { role: 'agent' })));
await t('non-staff read own users doc allowed', () =>
  assertSucceeds(getDoc(doc(visitor, 'users/visitor1'))));
await t('non-staff read other users doc denied', () =>
  assertFails(getDoc(doc(visitor, 'users/agent1'))));

console.log('\n— catalog + catch-all —');
await t('anon get published listing allowed', () =>
  assertSucceeds(getDoc(doc(anon, 'listings/pub1'))));
await t('anon get draft listing denied', () =>
  assertFails(getDoc(doc(anon, 'listings/draft1'))));
await t('staff get draft listing allowed', () =>
  assertSucceeds(getDoc(doc(agent, 'listings/draft1'))));
await t('anon read leads denied', () =>
  assertFails(getDoc(doc(anon, 'leads/lead1'))));
await t('non-staff read leads denied', () =>
  assertFails(getDoc(doc(visitor, 'leads/lead1'))));
await t('staff read leads allowed (catch-all)', () =>
  assertSucceeds(getDoc(doc(agent, 'leads/lead1'))));
await t('staff write leads allowed (catch-all)', () =>
  assertSucceeds(updateDoc(doc(agent, 'leads/lead1'), { note: 'called' })));

await env.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
