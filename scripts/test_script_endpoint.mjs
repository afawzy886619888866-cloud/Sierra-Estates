const EXEC_URL = process.env.SIERRA_SHEET_WRITE_URL;
if (!EXEC_URL) throw new Error('SIERRA_SHEET_WRITE_URL is required');
const SECRET = process.env.SIERRA_SHEET_WRITE_SECRET;
if (!SECRET) throw new Error('SIERRA_SHEET_WRITE_SECRET is required');

async function test(name, payload) {
  try {
    const res = await fetch(EXEC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`[${name}] Status: ${res.status} | Response: ${text}`);
  } catch (err) {
    console.error(`[${name}] Error:`, err.message);
  }
}

async function get() {
  try {
    const res = await fetch(EXEC_URL, { redirect: 'follow' });
    console.log(`[GET] Status: ${res.status} | Response: ${await res.text()}`);
  } catch (err) {
    console.error('[GET] Error:', err.message);
  }
}

async function main() {
  await get(); // diagnostics: shows version + supported actions after v2 redeploy
  await test('Empty POST', {});
  await test('Only Secret', { secret: SECRET });
  await test('Normal Rows with unlisted phone', { secret: SECRET, rows: [{ phone: '01099999999', date: '17/10/2026' }] });
  // v2 merge actions (no-ops until the v2 script is deployed):
  await test('appendRows empty', { secret: SECRET, action: 'appendRows', rows: [] });
  await test('importNewMasterRows', { secret: SECRET, action: 'importNewMasterRows' });
  await test('Wrong Secret', { secret: 'nope' });
}

main();
