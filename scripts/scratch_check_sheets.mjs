async function check(sheetId) {
  console.log('=== Checking Sheet:', sheetId);
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    const html = await res.text();
    const gidMatches = Array.from(html.matchAll(/"sheetId":(\d+)[^}]*?"name":"([^"]+)"/g));
    const tabs = new Map();
    for (const m of gidMatches) tabs.set(m[1], m[2]);
    console.log(`Found ${tabs.size} tabs:`);
    for (const [gid, name] of tabs.entries()) {
      try {
        const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
        const text = await csvRes.text();
        const lines = text.split('\n').filter(Boolean);
        console.log(`  GID ${gid} [${name}]: ${lines.length} rows`);
      } catch (e) {
        console.log(`  GID ${gid} [${name}]: fetch failed (${e.message})`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  await check('1VEOSYbXPNVWVzC8A_yhYYdsYMqJwAoEnOFGZcJqSzv4');
  await check('1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk');
  await check('1JwY0lEhfre0-K4Dicq9Z088P45eEQGvPaUoCIxtjRvc');
}

run();
