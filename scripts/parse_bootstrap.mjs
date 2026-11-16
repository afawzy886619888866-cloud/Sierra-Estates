const sheetId = '1q-dQmbFS9UZkRrL_HmJIxBXQ-ASEPkM7MvFiviojw7A';

async function main() {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
  const html = await res.text();
  
  // Extract all numbers following gridId or sheetId or tab id patterns
  const re = /gridId"?\s*:\s*(\d+)/g;
  const gids = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    gids.add(m[1]);
  }
  
  // Also look for sheetNames
  const names = new Set();
  for (const match of html.matchAll(/"name"\s*:\s*"([^"]+)"/g)) {
    names.add(match[1]);
  }
  
  // Also look for [id, "Title", index]
  const tabDefs = [];
  for (const match of html.matchAll(/\[(\d+),\s*"([^"]+)",\s*\d+\]/g)) {
    tabDefs.push({ id: match[1], name: match[2] });
  }

  console.log('Grid IDs found:', Array.from(gids));
  console.log('Tab Defs found:', tabDefs);
  console.log('Sample names found:', Array.from(names).slice(0, 20));

  // Test discovered GIDs
  for (const gid of gids) {
    try {
      const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
      if (csvRes.ok) {
        const text = await csvRes.text();
        const lines = text.split('\n').filter(Boolean);
        console.log(`GID ${gid} -> Lines: ${lines.length} | First: ${lines[0]?.slice(0, 80)}`);
      } else {
        console.log(`GID ${gid} -> HTTP ${csvRes.status}`);
      }
    } catch (e) {
      console.log(`GID ${gid} error: ${e.message}`);
    }
  }
}

main();
