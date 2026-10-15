const sheetId = '1q-dQmbFS9UZkRrL_HmJIxBXQ-ASEPkM7MvFiviojw7A';

async function fetchSheetInfo() {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    const html = await res.text();
    
    // Scan for gids and names in the bootstrap data
    const gidMatches = Array.from(html.matchAll(/"sheetId":(\d+)[^}]*?"name":"([^"]+)"/g));
    const altMatches = Array.from(html.matchAll(/"name":"([^"]+)"[^}]*?"sheetId":(\d+)/g));
    
    const tabs = new Map();
    for (const m of gidMatches) tabs.set(m[1], m[2]);
    for (const m of altMatches) tabs.set(m[2], m[1]);
    
    console.log(`Found ${tabs.size} tabs:`);
    for (const [gid, name] of tabs.entries()) {
      console.log(`  GID: ${gid} | Name: "${name}"`);
      // probe line count
      try {
        const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
        if (csvRes.ok) {
          const text = await csvRes.text();
          const lines = text.split('\n').filter(Boolean);
          console.log(`       -> Lines: ${lines.length} | First row: ${lines[0]?.slice(0, 80)}`);
        }
      } catch (err) {
        console.log(`       -> CSV fetch error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Error fetching sheet info:', err);
  }
}

fetchSheetInfo();
