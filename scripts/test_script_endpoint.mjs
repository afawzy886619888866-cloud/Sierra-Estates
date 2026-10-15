const EXEC_URL = 'https://script.google.com/macros/s/AKfycbzsP2fwASxIVu_r0_rHVyzfVfGii3zHJaEtc29-l3K_IvBG7bmTdWaLngCmyLTG2GnY/exec';
const SECRET = 'SE_OUTREACH_SECRET_2026_CAIRO';

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

async function main() {
  await test('Empty POST', {});
  await test('Only Secret', { secret: SECRET });
  await test('Action Append Test', { secret: SECRET, action: 'append', row: ['test'] });
  await test('Action Upsert Test', { secret: SECRET, action: 'upsert', rows: [{ phone: '01000000000' }] });
  await test('Normal Rows with unlisted phone', { secret: SECRET, rows: [{ phone: '01099999999', date: '15/10/2026' }] });
}

main();
